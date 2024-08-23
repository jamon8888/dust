import type {
  BlockType,
  CredentialsType,
  ModelIdType,
  ModelProviderIdType,
  TraceType,
  WithAPIErrorResponse,
} from "@dust-tt/types";
import type { RunType } from "@dust-tt/types";
import {
  assertNever,
  credentialsFromProviders,
  dustManagedCredentials,
  DustUserIdHeader,
  rateLimiter,
} from "@dust-tt/types";
import { CoreAPI } from "@dust-tt/types";
import { createParser } from "eventsource-parser";
import type { NextApiRequest, NextApiResponse } from "next";

import { getApp } from "@app/lib/api/app";
import apiConfig from "@app/lib/api/config";
import { getDustAppSecrets } from "@app/lib/api/dust_app_secrets";
import { Authenticator, getAPIKey } from "@app/lib/auth";
import { getGroupIdsFromHeaders } from "@app/lib/http_api/group_header";
import { Provider } from "@app/lib/models/apps";
import type { KeyResource } from "@app/lib/resources/key_resource";
import type { RunUsageType } from "@app/lib/resources/run_resource";
import { RunResource } from "@app/lib/resources/run_resource";
import logger from "@app/logger/logger";
import { apiError, withLogging } from "@app/logger/withlogging";

export type PostRunResponseBody = {
  run: RunType;
};

export const config = {
  api: {
    responseLimit: "8mb",
  },
};

type RunFlavor = "blocking" | "streaming" | "non-blocking";

type Trace = [[BlockType, string], TraceType[][]];

function extractUsageFromExecutions(
  block: { provider_id: ModelProviderIdType; model_id: ModelIdType },
  traces: TraceType[][],
  usages: RunUsageType[]
) {
  if (block) {
    traces.forEach((tracesInner) => {
      tracesInner.forEach((trace) => {
        if (trace?.meta) {
          const { token_usage } = trace.meta as {
            token_usage: { prompt_tokens: number; completion_tokens: number };
          };
          if (token_usage) {
            const promptTokens = token_usage.prompt_tokens;
            const completionTokens = token_usage.completion_tokens;
            usages.push({
              providerId: block.provider_id,
              modelId: block.model_id,
              promptTokens,
              completionTokens,
            });
          }
        }
      });
    });
  }
}

/**
 * @swagger
 * /api/v1/w/{wId}/apps/{aId}/run:
 *   post:
 *     summary: Create an app run
 *     description: Create and execute a run for an app in the specified workspace.
 *     tags:
 *       - Apps
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wId
 *         required: true
 *         description: Unique string identifier for the workspace
 *         schema:
 *           type: string
 *       - in: path
 *         name: aId
 *         required: true
 *         description: Unique identifier of the app
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - specification_hash
 *               - config
 *               - inputs
 *             properties:
 *               specification_hash:
 *                 type: string
 *                 description: Hash of the app specification. Ensures API compatibility across app iterations.
 *               config:
 *                 type: object
 *                 description: Configuration for the app run
 *                 properties:
 *                   model:
 *                     type: object
 *                     description: Model configuration
 *                     properties:
 *                       provider_id:
 *                         type: string
 *                         description: ID of the model provider
 *                       model_id:
 *                         type: string
 *                         description: ID of the model
 *                       use_cache:
 *                         type: boolean
 *                         description: Whether to use caching
 *                       use_stream:
 *                         type: boolean
 *                         description: Whether to use streaming
 *               inputs:
 *                 type: array
 *                 description: Array of input objects for the app
 *                 items:
 *                   type: object
 *                   additionalProperties: true
 *               stream:
 *                 type: boolean
 *                 description: If true, the response will be streamed
 *               blocking:
 *                 type: boolean
 *                 description: If true, the request will block until the run is complete
 *               block_filter:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of block names to filter the response
 *     responses:
 *       200:
 *         description: App run created and executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 run:
 *                   $ref: '#/components/schemas/Run'
 *       400:
 *         description: Bad Request. Missing or invalid parameters.
 *       401:
 *         description: Unauthorized. Invalid or missing authentication token.
 *       404:
 *         description: Workspace or app not found.
 *       405:
 *         description: Method not supported.
 *       500:
 *         description: Internal Server Error.
 */

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WithAPIErrorResponse<PostRunResponseBody>>
): Promise<void> {
  const keyRes = await getAPIKey(req);
  if (keyRes.isErr()) {
    return apiError(req, res, keyRes.error);
  }

  const { keyAuth, workspaceAuth } = await Authenticator.fromKey(
    keyRes.value,
    req.query.wId as string,
    getGroupIdsFromHeaders(req.headers)
  );

  const owner = workspaceAuth.workspace();
  if (!owner) {
    return apiError(req, res, {
      status_code: 404,
      api_error: {
        type: "workspace_not_found",
        message: "The workspace was not found.",
      },
    });
  }

  const [app, providers, secrets] = await Promise.all([
    getApp(workspaceAuth, req.query.aId as string),
    Provider.findAll({
      where: {
        workspaceId: keyRes.value.workspaceId,
      },
    }),
    getDustAppSecrets(workspaceAuth, true),
  ]);

  if (!app) {
    return apiError(req, res, {
      status_code: 404,
      api_error: {
        type: "app_not_found",
        message: "The app you're trying to run was not found",
      },
    });
  }

  // This variable is used in the context of the DustAppRun action to use the workspace credentials
  // instead of our managed credentials when running an app with a system API key.
  const useWorkspaceCredentials = !!req.query["use_workspace_credentials"];
  const coreAPI = new CoreAPI(apiConfig.getCoreAPIConfig(), logger);
  const runFlavor: RunFlavor = req.body.stream
    ? "streaming"
    : req.body.blocking
      ? "blocking"
      : "non-blocking";

  switch (req.method) {
    case "POST":
      if (
        !req.body ||
        !(typeof req.body.specification_hash === "string") ||
        !(typeof req.body.config === "object" && req.body.config !== null) ||
        !Array.isArray(req.body.inputs)
      ) {
        return apiError(req, res, {
          status_code: 400,
          api_error: {
            type: "invalid_request_error",
            message:
              "Invalid request body, `specification_hash` (string), `config` (object), and `inputs` (array) are required.",
          },
        });
      }

      const config = req.body.config;
      const inputs = req.body.inputs;
      const specificationHash = req.body.specification_hash;

      for (const name in config) {
        const c = config[name];
        if (c.type == "input") {
          delete c.dataset;
        }
      }

      let credentials: CredentialsType | null = null;
      if (keyRes.value.isSystem && !useWorkspaceCredentials) {
        // Dust managed credentials: system API key (packaged apps).
        credentials = dustManagedCredentials();
      } else {
        credentials = credentialsFromProviders(providers);
      }

      if (!keyRes.value.isSystem) {
        const remaining = await rateLimiter({
          key: `app_run:w:${owner.sId}:a:${app.sId}`,
          maxPerTimeframe: 10000,
          timeframeSeconds: 60 * 60 * 24,
          logger: logger,
        });
        if (remaining === 0) {
          return apiError(req, res, {
            status_code: 429,
            api_error: {
              type: "rate_limit_error",
              message: `You have reached the maximum number of 10000 runs over the last 24 hours.`,
            },
          });
        }
      }

      logger.info(
        {
          workspace: {
            sId: owner.sId,
            name: owner.name,
          },
          app: app.sId,
        },
        "App run creation"
      );

      const auth = await getAuthToUse(req, keyAuth, keyRes.value);

      const runRes = await coreAPI.createRunStream(
        auth.getNonNullableWorkspace(),
        auth.groups(),
        {
          projectId: app.dustAPIProjectId,
          runType: "deploy",
          specificationHash: specificationHash,
          config: { blocks: config },
          inputs,
          credentials,
          secrets,
        }
      );

      if (runRes.isErr()) {
        return apiError(req, res, {
          status_code: 400,
          api_error: {
            type: "run_error",
            message: "There was an error running the app.",
            run_error: runRes.error,
          },
        });
      }

      switch (runFlavor) {
        case "streaming":
          // Start SSE stream.
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          break;
        case "blocking":
          // Blocking, nothing to do for now
          break;

        case "non-blocking":
          // Non blocking, return a run object as soon as we get the runId.
          void (async () => {
            const dustRunId = await runRes.value.dustRunId;

            const statusRunRes = await coreAPI.getRunStatus({
              projectId: app.dustAPIProjectId,
              runId: dustRunId,
            });

            if (statusRunRes.isErr()) {
              return apiError(req, res, {
                status_code: 500,
                api_error: {
                  type: "run_error",
                  message: "There was an error getting the app run status.",
                  run_error: statusRunRes.error,
                },
              });
            }

            const run: RunType = statusRunRes.value.run;
            run.specification_hash = run.app_hash;
            delete run.app_hash;

            run.status.blocks = [];
            run.results = null;

            res.status(200).json({ run: run as RunType });
          })();
          break;

        default:
          assertNever(runFlavor);
      }

      const usages: RunUsageType[] = [];
      const traces: Trace[] = [];

      try {
        // Intercept block_execution events to store token usages.
        const parser = createParser((event) => {
          if (event.type === "event") {
            if (event.data) {
              try {
                const data = JSON.parse(event.data);
                if (data.type === "block_execution") {
                  if (runFlavor === "blocking") {
                    // Keep track of block executions for blocking requests.
                    traces.push([
                      [data.content.block_type, data.content.block_name],
                      data.content.execution,
                    ]);
                  }
                  const block = config[data.content.block_name];
                  extractUsageFromExecutions(
                    block,
                    data.content.execution,
                    usages
                  );
                }
              } catch (err) {
                logger.error(
                  { error: err },
                  "Error parsing run events while extracting usage from executions"
                );
              }
            }
          }
        });

        for await (const chunk of runRes.value.chunkStream) {
          parser.feed(new TextDecoder().decode(chunk));
          if (runFlavor === "streaming") {
            res.write(chunk);
            // @ts-expect-error we need to flush for streaming but TS thinks flush() does not exists.
            res.flush();
          }
        }
      } catch (err) {
        logger.error(
          {
            error: err,
          },
          "Error streaming from Dust API"
        );

        if (runFlavor === "streaming") {
          res.end();
        }

        throw err;
      }

      const dustRunId = await runRes.value.dustRunId;

      const run = await RunResource.makeNew({
        dustRunId,
        appId: app.id,
        runType: "deploy",
        workspaceId: keyRes.value.workspaceId,
      });

      await run.recordRunUsage(usages);

      switch (runFlavor) {
        case "streaming":
          // End SSE stream.
          res.end();
          return;

        case "blocking":
          // Blocking, return the run status.
          const statusRunRes = await coreAPI.getRunStatus({
            projectId: app.dustAPIProjectId,
            runId: dustRunId,
          });

          if (statusRunRes.isErr()) {
            return apiError(req, res, {
              status_code: 500,
              api_error: {
                type: "run_error",
                message: "There was an error getting the app run details.",
                run_error: statusRunRes.error,
              },
            });
          }

          const run: RunType = statusRunRes.value.run;
          run.specification_hash = run.app_hash;
          delete run.app_hash;

          run.traces = traces;

          if (req.body.block_filter && Array.isArray(req.body.block_filter)) {
            run.traces = run.traces.filter((t: any) => {
              return req.body.block_filter.includes(t[0][1]);
            });

            run.status.blocks = run.status.blocks.filter((c: any) => {
              return req.body.block_filter.includes(c.name);
            });
          }

          if (run.status.run === "succeeded" && run.traces.length > 0) {
            run.results = run.traces[run.traces.length - 1][1];
          } else {
            run.results = null;
          }

          res.status(200).json({ run: run as RunType });
          return;

        case "non-blocking":
          // Response already sent earlier in async block.
          return;

        default:
          assertNever(runFlavor);
      }

      return;
    default:
      return apiError(req, res, {
        status_code: 405,
        api_error: {
          type: "method_not_supported_error",
          message: "The method passed is not supported, POST is expected.",
        },
      });
  }
}

export default withLogging(handler);

async function getAuthToUse(
  req: NextApiRequest,
  keyAuth: Authenticator,
  key: KeyResource
): Promise<Authenticator> {
  // If the key is a system key, and the x-dust-user-id is set, return an auth representing the user.
  if (key.isSystem) {
    const userId = req.headers[DustUserIdHeader];
    if (typeof userId === "string") {
      const auth = await Authenticator.fromUserIdAndWorkspaceId(
        userId,
        keyAuth.getNonNullableWorkspace().sId
      );

      return auth;
    }
  }

  return keyAuth;
}
