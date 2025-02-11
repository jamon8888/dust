import type {
  ContentNode,
  ContentNodeWithParentIds,
  Result,
} from "@dust-tt/types";
import { Ok } from "@dust-tt/types";
import { zip } from "fp-ts/lib/Array";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";

import { getConnectorManager } from "@connectors/connectors";
import { concurrentExecutor } from "@connectors/lib/async_utils";
import type { ConnectorResource } from "@connectors/resources/connector_resource";

export interface ContentNodeParentIdsBlob {
  internalId: string;
  parentInternalIds: string[];

  // TODO(2024-08-28 flav) Remove once front has been updated to use `parentInternalIds`.
  parents: string[];
}

export async function getParentIdsForContentNodes(
  connector: ConnectorResource,
  internalIds: string[]
): Promise<Result<ContentNodeParentIdsBlob[], Error>> {
  const connectorManager = getConnectorManager({
    connectorProvider: connector.type,
    connectorId: connector.id,
  });

  const memoizationKey = uuidv4();

  const parentsResults = await concurrentExecutor(
    internalIds,
    (internalId) =>
      connectorManager.retrieveContentNodeParents({
        internalId,
        memoizationKey,
      }),
    { concurrency: 30 }
  );

  const nodes: ContentNodeParentIdsBlob[] = [];

  for (const [internalId, parentsResult] of zip(internalIds, parentsResults)) {
    if (parentsResult.isErr()) {
      return parentsResult;
    }

    nodes.push({
      internalId,
      parentInternalIds: parentsResult.value,

      // TODO(2024-08-28 flav) Remove once front has been updated to use `parentInternalIds`.
      parents: parentsResult.value,
    });
  }

  return new Ok(nodes);
}

export async function augmentContentNodesWithParentIds(
  connector: ConnectorResource,
  contentNodes: ContentNode[]
): Promise<Promise<Result<ContentNodeWithParentIds[], Error>>> {
  const internalIds = contentNodes.map((node) => node.internalId);

  const parentsRes = await getParentIdsForContentNodes(connector, internalIds);
  if (parentsRes.isErr()) {
    return parentsRes;
  }

  const nodesWithParentIds: ContentNodeWithParentIds[] = [];
  const contentNodesMap = _.keyBy(contentNodes, "internalId");

  for (const { internalId, parentInternalIds } of parentsRes.value) {
    const node = contentNodesMap[internalId];

    if (node) {
      nodesWithParentIds.push({
        ...node,
        parentInternalIds,
      });
    }
  }

  return new Ok(nodesWithParentIds);
}
