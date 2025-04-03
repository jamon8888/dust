import {
  BookOpenIcon,
  ContextItem,
  EyeIcon,
  HubspotLogo,
  Icon,
  Page,
  TestTubeIcon,
} from "@dust-tt/sparkle";
import type { InferGetServerSidePropsType } from "next";

import { ConversationsNavigationProvider } from "@app/components/assistant/conversation/ConversationsNavigationProvider";
import { AssistantSidebarMenu } from "@app/components/assistant/conversation/SidebarMenu";
import { FeatureAccessButton } from "@app/components/labs/FeatureAccessButton";
import AppLayout from "@app/components/sparkle/AppLayout";
import { getFeatureFlags } from "@app/lib/auth";
import { withDefaultUserAuthRequirements } from "@app/lib/iam/session";
import type {
  LabsConnectionItemType,
  LabsFeatureItemType,
  SubscriptionType,
  WhitelistableFeature,
  WorkspaceType,
} from "@app/types";

const LABS_FEATURES: LabsFeatureItemType[] = [
  {
    id: "transcripts",
    label: "Meeting Transcripts Processing",
    featureFlag: "labs_transcripts",
    visibleWithoutAccess: true,
    icon: EyeIcon,
    description:
      "Receive meeting minutes processed by email automatically and store them in a Dust Folder.",
  },
  {
    id: "trackers",
    label: "Document Tracker",
    featureFlag: "labs_trackers",
    visibleWithoutAccess: false,
    icon: BookOpenIcon,
    description:
      "Document monitoring made simple - receive alerts when documents are out of date.",
  },
];

const LABS_CONNECTIONS: LabsConnectionItemType[] = [
  {
    id: "hubspot",
    label: "Hubspot",
    featureFlag: "labs_connection_hubspot",
    visibleWithoutAccess: true,
    logo: HubspotLogo,
    description: "Import your Hubspot data into Dust.",
  },
];

export const getServerSideProps = withDefaultUserAuthRequirements<{
  owner: WorkspaceType;
  subscription: SubscriptionType;
  featureFlags: WhitelistableFeature[];
  isAdmin: boolean;
}>(async (_context, auth) => {
  const owner = auth.workspace();
  const subscription = auth.subscription();
  const user = auth.user();

  if (!owner || !subscription || !user) {
    return {
      notFound: true,
    };
  }

  const featureFlags = await getFeatureFlags(owner);

  return {
    props: {
      owner,
      subscription,
      featureFlags,
      isAdmin: auth.isAdmin(),
    },
  };
});

const getVisibleFeatures = (featureFlags: WhitelistableFeature[]) => {
  return LABS_FEATURES.filter(
    (feature) =>
      feature.visibleWithoutAccess || featureFlags.includes(feature.featureFlag)
  );
};

const getVisibleConnections = (featureFlags: WhitelistableFeature[]) => {
  return LABS_CONNECTIONS.filter(
    (connection) =>
      connection.visibleWithoutAccess ||
      featureFlags.includes(connection.featureFlag)
  );
};
export default function LabsTranscriptsIndex({
  owner,
  subscription,
  featureFlags,
  isAdmin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ConversationsNavigationProvider>
      <AppLayout
        subscription={subscription}
        owner={owner}
        pageTitle="Dust - Transcripts processing"
        navChildren={<AssistantSidebarMenu owner={owner} />}
      >
        <Page>
          <Page.Header
            title="Beta features"
            icon={TestTubeIcon}
            description="Expect some bumps and changes. Feedback welcome, tell us what you think!"
          />
          <Page.Layout direction="vertical">
            <ContextItem.List>
              <ContextItem.SectionHeader
                title="Features"
                description="All features presented here are in beta and may change or be removed."
              />

              {getVisibleFeatures(featureFlags).map((item) => (
                <ContextItem
                  key={item.id}
                  title={item.label}
                  action={
                    <FeatureAccessButton
                      accessible={featureFlags.includes(item.featureFlag)}
                      featureName={item.label}
                      managePath={`/w/${owner.sId}/labs/${item.id}`}
                      owner={owner}
                    />
                  }
                  visual={<Icon visual={item.icon} />}
                >
                  <ContextItem.Description description={item.description} />
                </ContextItem>
              ))}

              {isAdmin && (
                <>
                  <ContextItem.SectionHeader
                    title="Connections"
                    description="These connections are being tested and may require some manual steps."
                  />

                  {getVisibleConnections(featureFlags).map((item) => (
                    <ContextItem
                      key={item.id}
                      title={item.label}
                      action={
                        <FeatureAccessButton
                          accessible={featureFlags.includes(item.featureFlag)}
                          featureName={`${item.label} connection`}
                          managePath={`/w/${owner.sId}/labs/connections/${item.id}`}
                          owner={owner}
                        />
                      }
                      visual={<ContextItem.Visual visual={item.logo} />}
                    >
                      <ContextItem.Description description={item.description} />
                    </ContextItem>
                  ))}
                </>
              )}
            </ContextItem.List>
          </Page.Layout>
        </Page>
      </AppLayout>
    </ConversationsNavigationProvider>
  );
}
