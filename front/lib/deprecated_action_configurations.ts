import logger from "@app/logger/logger";
import type {
  AgentConfigurationType,
  TemplateAgentConfigurationType,
} from "@app/types";

export function deprecatedGetFirstActionConfiguration(
  config: AgentConfigurationType | TemplateAgentConfigurationType
) {
  if (config.actions.length > 1) {
    logger.warn(
      {
        agentConfigurationId: "sId" in config ? config.sId : "template",
        agentConfigurationName: config.name,
      },
      "Multiple actions are not supported yet. The first action will be used."
    );
  }
  if (config.actions.length) {
    return config.actions[0];
  }
  return null;
}
