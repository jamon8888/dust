import { Authenticator } from "@app/lib/auth";
import { GroupResource } from "@app/lib/resources/group_resource";
import { KeyResource } from "@app/lib/resources/key_resource";
import type { Logger } from "@app/logger/logger";
import { makeScript } from "@app/scripts/helpers";
import { runOnAllWorkspaces } from "@app/scripts/workspace_helpers";
import type { LightWorkspaceType } from "@app/types";
async function backfillApiKeys(
  workspace: LightWorkspaceType,
  logger: Logger,
  execute: boolean
) {
  logger.info("Handle workspace " + workspace.id);
  const auth = await Authenticator.internalAdminForWorkspace(workspace.sId);

  if (execute) {
    const globalGroup = await GroupResource.fetchWorkspaceGlobalGroup(auth);
    if (globalGroup.isOk()) {
      await KeyResource.model.update(
        { groupId: globalGroup.value.id },
        {
          where: {
            workspaceId: workspace.id,
            isSystem: false,
          },
        }
      );
    }

    const systemGroup = await GroupResource.fetchWorkspaceSystemGroup(auth);
    if (systemGroup.isOk()) {
      await KeyResource.model.update(
        { groupId: systemGroup.value.id },
        {
          where: {
            workspaceId: workspace.id,
            isSystem: true,
          },
        }
      );
    }
  }
  logger.info("Done with workspace " + workspace.id);
}

makeScript({}, async ({ execute }, logger) => {
  return runOnAllWorkspaces(async (workspace) => {
    await backfillApiKeys(workspace, logger, execute);
  });
});
