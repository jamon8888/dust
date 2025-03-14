import type { AgentProcessConfiguration } from "@app/lib/models/assistant/actions/process";
import type { AgentRetrievalConfiguration } from "@app/lib/models/assistant/actions/retrieval";
import type { RetrievalTimeframe } from "@app/types";

export function renderRetrievalTimeframeType(
  action: AgentRetrievalConfiguration | AgentProcessConfiguration
) {
  let timeframe: RetrievalTimeframe = "auto";
  if (
    action.relativeTimeFrame === "custom" &&
    action.relativeTimeFrameDuration &&
    action.relativeTimeFrameUnit
  ) {
    timeframe = {
      duration: action.relativeTimeFrameDuration,
      unit: action.relativeTimeFrameUnit,
    };
  } else if (action.relativeTimeFrame === "none") {
    timeframe = "none";
  }
  return timeframe;
}
