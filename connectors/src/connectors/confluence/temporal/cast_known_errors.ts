import type {
  ActivityExecuteInput,
  ActivityInboundCallsInterceptor,
  Next,
} from "@temporalio/worker";

import { ProviderWorkflowError } from "@connectors/lib/error";
import { ConfluenceClientError } from "@connectors/types";

export class ConfluenceCastKnownErrorsInterceptor
  implements ActivityInboundCallsInterceptor
{
  async execute(
    input: ActivityExecuteInput,
    next: Next<ActivityInboundCallsInterceptor, "execute">
  ): Promise<unknown> {
    try {
      return await next(input);
    } catch (err: unknown) {
      if (
        err instanceof ConfluenceClientError &&
        err.type === "http_response_error"
      ) {
        switch (err.status) {
          case 429:
            throw new ProviderWorkflowError(
              "confluence",
              "429 - Rate Limit Exceeded",
              "rate_limit_error",
              err
            );

          case 500:
            throw new ProviderWorkflowError(
              "confluence",
              "500 - Internal Error",
              "transient_upstream_activity_error",
              err
            );

          case 502:
            throw new ProviderWorkflowError(
              "confluence",
              "502 - Bad Gateway",
              "transient_upstream_activity_error",
              err
            );

          case 504:
            throw new ProviderWorkflowError(
              "confluence",
              "504 - Gateway Time Out",
              "transient_upstream_activity_error",
              err
            );
        }
      }

      throw err;
    }
  }
}
