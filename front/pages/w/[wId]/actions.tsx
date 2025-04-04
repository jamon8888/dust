import { CommandLineIcon, Page } from "@dust-tt/sparkle";
import type { InferGetServerSidePropsType } from "next";
import { useState } from "react";

import { InternalMCPServerDetails } from "@app/components/actions/mcp/ActionDetails";
import { AdminActionsList } from "@app/components/actions/mcp/ActionsList";
import { RemoteMCPServerDetails } from "@app/components/actions/mcp/RemoteMCPServerDetails";
import { subNavigationAdmin } from "@app/components/navigation/config";
import AppLayout from "@app/components/sparkle/AppLayout";
import { getServerTypeAndIdFromSId } from "@app/lib/actions/mcp_helper";
import type { MCPServerType } from "@app/lib/actions/mcp_metadata";
import { getFeatureFlags } from "@app/lib/auth";
import { withDefaultUserAuthPaywallWhitelisted } from "@app/lib/iam/session";
import { MCPServerViewResource } from "@app/lib/resources/mcp_server_view_resource";
import { useMCPServers } from "@app/lib/swr/mcp_servers";
import type { SubscriptionType, WorkspaceType } from "@app/types";

export const getServerSideProps = withDefaultUserAuthPaywallWhitelisted<{
  owner: WorkspaceType;
  subscription: SubscriptionType;
}>(async (context, auth) => {
  const owner = auth.getNonNullableWorkspace();
  const subscription = auth.getNonNullableSubscription();
  if (!auth.isAdmin()) {
    return {
      notFound: true,
    };
  }

  const featureFlags = await getFeatureFlags(owner);
  if (!featureFlags.includes("mcp_actions")) {
    return {
      notFound: true,
    };
  }

  await MCPServerViewResource.ensureAllDefaultActionsAreCreated(auth);

  return {
    props: {
      owner,
      isAdmin: auth.isAdmin(),
      subscription,
    },
  };
});

export default function AdminActions({
  owner,
  subscription,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [showDetails, setShowDetails] = useState<MCPServerType | null>(null);
  const [isRemoteCreationModalOpened, setRemoteCreationModalOpened] =
    useState(false);
  const serverType = showDetails
    ? getServerTypeAndIdFromSId(showDetails.id).serverType
    : isRemoteCreationModalOpened
      ? "remote"
      : null;

  const { mutateMCPServers } = useMCPServers({
    owner,
    filter: "all",
  });

  const closePanel = () => {
    setShowDetails(null);
    void mutateMCPServers();
    setRemoteCreationModalOpened(false);
  };

  return (
    <AppLayout
      subscription={subscription}
      owner={owner}
      subNavigation={subNavigationAdmin({ owner, current: "actions" })}
    >
      {serverType === "internal" && (
        <InternalMCPServerDetails
          owner={owner}
          mcpServer={showDetails}
          onClose={closePanel}
        />
      )}

      {serverType === "remote" && (
        <RemoteMCPServerDetails
          owner={owner}
          mcpServer={showDetails}
          onClose={closePanel}
          open={isRemoteCreationModalOpened}
          mutateServers={mutateMCPServers}
        />
      )}

      <Page.Vertical gap="xl" align="stretch">
        <Page.Header
          title="Actions"
          icon={CommandLineIcon}
          description="Actions let you connect tools and automate tasks. Find all available actions here and set up new ones."
        />
        <Page.Vertical align="stretch" gap="md">
          <AdminActionsList
            owner={owner}
            setShowDetails={setShowDetails}
            openRemoteMCPCreationModal={() =>
              setRemoteCreationModalOpened(true)
            }
          />
        </Page.Vertical>
      </Page.Vertical>
      <div className="h-12" />
    </AppLayout>
  );
}
