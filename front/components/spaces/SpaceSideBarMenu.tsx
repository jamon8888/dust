import {
  Avatar,
  Button,
  CloudArrowLeftRightIcon,
  CommandLineIcon,
  NavigationList,
  NavigationListLabel,
  PlusIcon,
  Tree,
} from "@dust-tt/sparkle";
import { sortBy, uniqBy } from "lodash";
import { useRouter } from "next/router";
import type { ComponentType, ReactElement } from "react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { useTheme } from "@app/components/sparkle/ThemeContext";
import { usePersistedNavigationSelection } from "@app/hooks/usePersistedNavigationSelection";
import { getVisual } from "@app/lib/actions/mcp_icons";
import type { MCPServerViewType } from "@app/lib/api/mcp";
import { getConnectorProviderLogoWithFallback } from "@app/lib/connector_providers";
import { getVisualForDataSourceViewContentNode } from "@app/lib/content_nodes";
import { getDataSourceNameFromView } from "@app/lib/data_sources";
import type { SpaceSectionGroupType } from "@app/lib/spaces";
import {
  CATEGORY_DETAILS,
  getSpaceIcon,
  getSpaceName,
  groupSpacesForDisplay,
} from "@app/lib/spaces";
import { useApps } from "@app/lib/swr/apps";
import { useDataSourceViewContentNodes } from "@app/lib/swr/data_source_views";
import { useMCPServerViews } from "@app/lib/swr/mcp_server_views";
import {
  useSpaceDataSourceViews,
  useSpaceInfo,
  useSpaces,
  useSpacesAsAdmin,
} from "@app/lib/swr/spaces";
import { useFeatureFlags } from "@app/lib/swr/workspaces";
import type {
  AppType,
  DataSourceViewCategory,
  DataSourceViewCategoryWithoutApps,
  DataSourceViewContentNode,
  DataSourceViewType,
  LightWorkspaceType,
  SpaceType,
} from "@app/types";
import {
  asDisplayName,
  assertNever,
  DATA_SOURCE_VIEW_CATEGORIES,
} from "@app/types";

interface SpaceSideBarMenuProps {
  owner: LightWorkspaceType;
  isAdmin: boolean;
  openSpaceCreationModal?: ({
    defaultRestricted,
  }: {
    defaultRestricted: boolean;
  }) => void;
}

export default function SpaceSideBarMenu({
  owner,
  isAdmin,
  openSpaceCreationModal,
}: SpaceSideBarMenuProps) {
  const { spaces: spacesAsAdmin, isSpacesLoading: isSpacesAsAdminLoading } =
    useSpacesAsAdmin({
      workspaceId: owner.sId,
      disabled: !isAdmin,
    });

  const { spaces: spacesAsUser, isSpacesLoading: isSpacesAsUserLoading } =
    useSpaces({
      workspaceId: owner.sId,
    });

  const compareSpaces = useCallback(
    (s1: SpaceType, s2: SpaceType) => {
      const s1IsMember = !!spacesAsUser.find((s) => s.sId === s1.sId);
      const s2IsMember = !!spacesAsUser.find((s) => s.sId === s2.sId);

      if (s1IsMember && !s2IsMember) {
        return -1;
      } else if (!s1IsMember && s2IsMember) {
        return 1;
      } else {
        return s1.name.localeCompare(s2.name);
      }
    },
    [spacesAsUser]
  );

  const spaces = useMemo(() => {
    return uniqBy(spacesAsAdmin.concat(spacesAsUser), "sId");
  }, [spacesAsAdmin, spacesAsUser]);

  if (isSpacesAsAdminLoading || isSpacesAsUserLoading || !spacesAsUser) {
    return <></>;
  }

  const sortedGroupedSpaces = groupSpacesForDisplay(spaces).filter(
    ({ section, spaces }) => section !== "system" || spaces.length !== 0
  );

  // Function to render space items.
  const renderSpaceItems = (
    spaces: SpaceType[],
    spacesAsUser: SpaceType[],
    owner: LightWorkspaceType
  ) => {
    return spaces.map((space) => (
      <Fragment key={`space-${space.sId}`}>
        {space.kind === "system" ? (
          <SystemSpaceMenu owner={owner} space={space} />
        ) : (
          <SpaceMenu
            owner={owner}
            space={space}
            isMember={!!spacesAsUser.find((v) => v.sId === space.sId)}
          />
        )}
      </Fragment>
    ));
  };

  return (
    <div className="flex h-0 min-h-full w-full overflow-y-auto">
      <NavigationList className="w-full px-3">
        {sortedGroupedSpaces.map(({ section, spaces }, index) => {
          if (section === "public" && !spaces.length) {
            return null;
          }

          if (section === "restricted" && !spaces.length && !isAdmin) {
            return null;
          }

          const sectionDetails = getSpaceSectionDetails(section);

          return (
            <Fragment key={`space-section-${index}`}>
              <div className="flex items-center justify-between pr-1">
                <NavigationListLabel
                  label={sectionDetails.label}
                  variant="secondary"
                />
                {sectionDetails.displayCreateSpaceButton &&
                  isAdmin &&
                  openSpaceCreationModal && (
                    <Button
                      className="mt-1"
                      size="xs"
                      variant="ghost"
                      label="New"
                      icon={PlusIcon}
                      onClick={() =>
                        openSpaceCreationModal({
                          defaultRestricted: sectionDetails.defaultRestricted,
                        })
                      }
                    />
                  )}
              </div>
              {renderSpaceItems(
                spaces.toSorted(compareSpaces),
                spacesAsUser,
                owner
              )}
            </Fragment>
          );
        })}
      </NavigationList>
    </div>
  );
}

type SpaceSectionStructureType =
  | {
      label: string;
      displayCreateSpaceButton: true;
      defaultRestricted: boolean;
    }
  | {
      label: string;
      displayCreateSpaceButton: false;
    };

const getSpaceSectionDetails = (
  kind: SpaceSectionGroupType
): SpaceSectionStructureType => {
  switch (kind) {
    case "shared":
      return {
        label: "Open Spaces",
        displayCreateSpaceButton: true,
        defaultRestricted: false,
      };

    case "restricted":
      return {
        label: "Restricted Spaces",
        displayCreateSpaceButton: true,
        defaultRestricted: true,
      };

    case "system":
      return { label: "", displayCreateSpaceButton: false };

    case "public":
      return { label: "Public", displayCreateSpaceButton: false };

    default:
      assertNever(kind);
  }
};

// System space.

const SYSTEM_SPACE_ITEMS = [
  {
    label: "Connection Admin",
    visual: CloudArrowLeftRightIcon,
    category: "managed" as DataSourceViewCategory,
  },
];

const SystemSpaceMenu = ({
  owner,
  space,
}: {
  owner: LightWorkspaceType;
  space: SpaceType;
}) => {
  return (
    <Tree variant="navigator">
      {SYSTEM_SPACE_ITEMS.map((item) => (
        <SystemSpaceItem
          category={item.category as DataSourceViewCategoryWithoutApps}
          key={item.label}
          label={item.label}
          owner={owner}
          space={space}
          visual={item.visual}
        />
      ))}
    </Tree>
  );
};

type IconType = ComponentType<{ className?: string }>;

const SystemSpaceItem = ({
  category,
  label,
  owner,
  space,
  visual,
}: {
  category: DataSourceViewCategoryWithoutApps;
  label: string;
  owner: LightWorkspaceType;
  space: SpaceType;
  visual: IconType;
}) => {
  const { setNavigationSelection } = usePersistedNavigationSelection();
  const router = useRouter();

  const itemPath = `/w/${owner.sId}/spaces/${space.sId}/categories/${category}`;
  const isAncestorToCurrentPage =
    router.asPath.startsWith(itemPath + "/") || router.asPath === itemPath;

  // Unfold the item if it's an ancestor of the current page.
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (isAncestorToCurrentPage) {
      setIsExpanded(isAncestorToCurrentPage);
    }
  }, [isAncestorToCurrentPage]);

  const { isSpaceDataSourceViewsLoading, spaceDataSourceViews } =
    useSpaceDataSourceViews({
      workspaceId: owner.sId,
      spaceId: space.sId,
      category,
      disabled: !isExpanded,
    });

  return (
    <Tree.Item
      isNavigatable
      label={label}
      collapsed={!isExpanded}
      onItemClick={async () => {
        await setNavigationSelection({ lastSpaceId: space.sId });
        void router.push(itemPath);
      }}
      isSelected={router.asPath === itemPath}
      onChevronClick={() => setIsExpanded(!isExpanded)}
      visual={visual}
      areActionsFading={false}
    >
      {isExpanded && (
        <Tree isLoading={isSpaceDataSourceViewsLoading}>
          {spaceDataSourceViews.map((ds) => (
            <SpaceDataSourceViewItem
              item={ds}
              key={ds.sId}
              owner={owner}
              space={space}
            />
          ))}
        </Tree>
      )}
    </Tree.Item>
  );
};

// Global + regular spaces.

const SpaceMenu = ({
  owner,
  space,
  isMember,
}: {
  owner: LightWorkspaceType;
  space: SpaceType;
  isMember: boolean;
}) => {
  return (
    <Tree variant="navigator">
      <SpaceMenuItem owner={owner} space={space} isMember={isMember} />
    </Tree>
  );
};

const SpaceMenuItem = ({
  owner,
  space,
  isMember,
}: {
  owner: LightWorkspaceType;
  space: SpaceType;
  isMember: boolean;
}) => {
  const router = useRouter();
  const { setNavigationSelection } = usePersistedNavigationSelection();
  const { hasFeature } = useFeatureFlags({
    workspaceId: owner.sId,
  });

  const spacePath = `/w/${owner.sId}/spaces/${space.sId}`;
  const isAncestorToCurrentPage =
    router.asPath.startsWith(spacePath + "/") || router.asPath === spacePath;

  // Unfold the space if it's an ancestor of the current page.
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (isAncestorToCurrentPage) {
      setIsExpanded(isAncestorToCurrentPage);
    }
  }, [isAncestorToCurrentPage]);

  const { spaceInfo, isSpaceInfoLoading } = useSpaceInfo({
    workspaceId: owner.sId,
    spaceId: space.sId,
    disabled: !isExpanded,
  });

  return (
    <Tree.Item
      isNavigatable
      label={getSpaceName(space)}
      collapsed={!isExpanded}
      onItemClick={async () => {
        await setNavigationSelection({ lastSpaceId: space.sId });
        void router.push(spacePath);
      }}
      isSelected={router.asPath === spacePath}
      onChevronClick={() => setIsExpanded(!isExpanded)}
      visual={getSpaceIcon(space)}
      tailwindIconTextColor={isMember ? undefined : "text-warning-400"}
      areActionsFading={false}
    >
      {isExpanded && (
        <Tree isLoading={isSpaceInfoLoading}>
          {spaceInfo?.categories &&
            DATA_SOURCE_VIEW_CATEGORIES.filter(
              (c) =>
                !!spaceInfo.categories[c] &&
                hasFeature(CATEGORY_DETAILS[c].flag)
            ).map((c) => {
              if (c === "apps") {
                return (
                  <SpaceAppSubMenu
                    key={c}
                    category={c}
                    owner={owner}
                    space={space}
                  />
                );
              } else if (c === "actions") {
                return (
                  <SpaceActionsSubMenu
                    key={c}
                    category={c}
                    owner={owner}
                    space={space}
                  />
                );
              } else {
                return (
                  spaceInfo.categories[c] && (
                    <SpaceDataSourceViewSubMenu
                      key={c}
                      category={c}
                      owner={owner}
                      space={space}
                    />
                  )
                );
              }
            })}
        </Tree>
      )}
    </Tree.Item>
  );
};

const SpaceDataSourceViewItem = ({
  item,
  owner,
  space,
  node,
}: {
  item: DataSourceViewType;
  owner: LightWorkspaceType;
  space: SpaceType;
  node?: DataSourceViewContentNode;
}): ReactElement => {
  const { isDark } = useTheme();
  const { setNavigationSelection } = usePersistedNavigationSelection();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const { isNodesLoading, nodes, totalNodesCountIsAccurate, totalNodesCount } =
    useDataSourceViewContentNodes({
      dataSourceView: item,
      owner,
      parentId: node?.internalId,
      viewType: "all",
      disabled: !isExpanded,
      swrOptions: {
        revalidateOnFocus: false,
      },
    });

  const basePath = `/w/${owner.sId}/spaces/${space.sId}/categories/${item.category}/data_source_views/${item.sId}`;

  // Load the currently selected node from router.query.parentId
  const {
    nodes: [selected],
  } = useDataSourceViewContentNodes({
    dataSourceView: item,
    owner,
    internalIds: [router.query.parentId as string],
    viewType: "all",
    disabled: !router.asPath.startsWith(basePath) || !router.query.parentId,
  });

  // isAncestorToCurrentPage is true if :
  // 1. The current path matches the basePath
  // 2. Either the current node is the root (!node) or the current node is a parent of the selected node
  const isAncestorToCurrentPage =
    router.asPath.startsWith(basePath) &&
    (!node || (node && selected?.parentInternalIds?.includes(node.internalId)));

  // Unfold the folder if it's an ancestor of the current page.
  useEffect(() => {
    if (isAncestorToCurrentPage) {
      setIsExpanded(isAncestorToCurrentPage);
    }
  }, [isAncestorToCurrentPage]);

  const LogoComponent = node
    ? getVisualForDataSourceViewContentNode(node)
    : getConnectorProviderLogoWithFallback({
        provider: item.dataSource.connectorProvider,
        isDark,
      });

  const dataSourceViewPath = node
    ? `${basePath}?parentId=${node?.internalId}`
    : basePath;

  const isEmpty = isExpanded && !isNodesLoading && nodes.length === 0;
  const expandableNodes = nodes.filter((node) => node.expandable);
  const hiddenNodesCount = Math.max(0, totalNodesCount - nodes.length);

  return (
    <Tree.Item
      isNavigatable
      type={isEmpty ? "leaf" : "node"}
      isSelected={router.asPath === dataSourceViewPath}
      onChevronClick={() => setIsExpanded(!isExpanded)}
      onItemClick={async () => {
        await setNavigationSelection({ lastSpaceId: space.sId });
        void router.push(dataSourceViewPath);
      }}
      collapsed={!isExpanded || isEmpty}
      label={node ? node.title : getDataSourceNameFromView(item)}
      visual={LogoComponent}
      areActionsFading={false}
    >
      {isExpanded && (
        <Tree isLoading={isNodesLoading}>
          {expandableNodes.map((node) => (
            <SpaceDataSourceViewItem
              item={item}
              key={node.internalId}
              owner={owner}
              space={space}
              node={node}
            />
          ))}
          {hiddenNodesCount > 0 && (
            <Tree.Empty
              label={`${expandableNodes.length > 0 ? "and " : ""}${hiddenNodesCount}${totalNodesCountIsAccurate ? "" : "+"} item${hiddenNodesCount > 1 ? "s" : ""}`}
              onItemClick={async () => {
                await setNavigationSelection({ lastSpaceId: space.sId });
                void router.push(dataSourceViewPath);
              }}
            />
          )}
        </Tree>
      )}
    </Tree.Item>
  );
};

const SpaceDataSourceViewSubMenu = ({
  owner,
  space,
  category,
}: {
  owner: LightWorkspaceType;
  space: SpaceType;
  category: DataSourceViewCategoryWithoutApps;
}) => {
  const { setNavigationSelection } = usePersistedNavigationSelection();
  const router = useRouter();

  const spaceCategoryPath = `/w/${owner.sId}/spaces/${space.sId}/categories/${category}`;
  const isAncestorToCurrentPage =
    router.asPath.startsWith(spaceCategoryPath + "/") ||
    router.asPath === spaceCategoryPath;

  // Unfold the space's category if it's an ancestor of the current page.
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (isAncestorToCurrentPage) {
      setIsExpanded(isAncestorToCurrentPage);
    }
  }, [isAncestorToCurrentPage]);

  const categoryDetails = CATEGORY_DETAILS[category];
  const { isSpaceDataSourceViewsLoading, spaceDataSourceViews } =
    useSpaceDataSourceViews({
      workspaceId: owner.sId,
      spaceId: space.sId,
      category,
    });
  const sortedViews = useMemo(() => {
    return spaceDataSourceViews.sort((a, b) =>
      getDataSourceNameFromView(a).localeCompare(getDataSourceNameFromView(b))
    );
  }, [spaceDataSourceViews]);

  return (
    <Tree.Item
      isNavigatable
      label={categoryDetails.label}
      collapsed={!isExpanded}
      onItemClick={async () => {
        await setNavigationSelection({ lastSpaceId: space.sId });
        void router.push(spaceCategoryPath);
      }}
      isSelected={router.asPath === spaceCategoryPath}
      onChevronClick={() => setIsExpanded(!isExpanded)}
      visual={categoryDetails.icon}
      areActionsFading={false}
      type={
        isSpaceDataSourceViewsLoading || spaceDataSourceViews.length > 0
          ? "node"
          : "leaf"
      }
    >
      {isExpanded && (
        <Tree isLoading={isSpaceDataSourceViewsLoading}>
          {sortedViews.map((ds) => (
            <SpaceDataSourceViewItem
              item={ds}
              key={ds.sId}
              owner={owner}
              space={space}
            />
          ))}
        </Tree>
      )}
    </Tree.Item>
  );
};

const SpaceAppItem = ({
  app,
  owner,
}: {
  app: AppType;
  owner: LightWorkspaceType;
}): ReactElement => {
  const { setNavigationSelection } = usePersistedNavigationSelection();
  const router = useRouter();

  const appPath = `/w/${owner.sId}/spaces/${app.space.sId}/apps/${app.sId}`;

  return (
    <Tree.Item
      isNavigatable
      type="leaf"
      isSelected={
        router.asPath === appPath ||
        router.asPath.includes(appPath + "/") ||
        router.asPath.includes(appPath + "?")
      }
      onItemClick={async () => {
        await setNavigationSelection({ lastSpaceId: app.space.sId });
        void router.push(appPath);
      }}
      label={app.name}
      visual={CommandLineIcon}
      areActionsFading={false}
    />
  );
};

const SpaceActionItem = ({
  action,
}: {
  action: MCPServerViewType;
  owner: LightWorkspaceType;
}): ReactElement => {
  return (
    <Tree.Item
      type="leaf"
      label={asDisplayName(action.server.name)}
      visual={() => <Avatar visual={getVisual(action.server)} size="xs" />}
      areActionsFading={false}
    />
  );
};

const SpaceAppSubMenu = ({
  owner,
  space,
  category,
}: {
  owner: LightWorkspaceType;
  space: SpaceType;
  category: "apps";
}) => {
  const { setNavigationSelection } = usePersistedNavigationSelection();
  const router = useRouter();

  const spaceCategoryPath = `/w/${owner.sId}/spaces/${space.sId}/categories/${category}`;
  const isAncestorToCurrentPage =
    router.asPath.startsWith(spaceCategoryPath + "/") ||
    router.asPath === spaceCategoryPath;

  // Unfold the space's category if it's an ancestor of the current page.
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (isAncestorToCurrentPage) {
      setIsExpanded(isAncestorToCurrentPage);
    }
  }, [isAncestorToCurrentPage]);

  const categoryDetails = CATEGORY_DETAILS[category];

  const { isAppsLoading, apps } = useApps({
    owner,
    space,
  });

  return (
    <Tree.Item
      isNavigatable
      label={categoryDetails.label}
      collapsed={!isExpanded}
      onItemClick={async () => {
        await setNavigationSelection({ lastSpaceId: space.sId });
        void router.push(spaceCategoryPath);
      }}
      isSelected={router.asPath === spaceCategoryPath}
      onChevronClick={() => setIsExpanded(!isExpanded)}
      visual={categoryDetails.icon}
      areActionsFading={false}
      type={isAppsLoading || apps.length > 0 ? "node" : "leaf"}
    >
      {isExpanded && (
        <Tree isLoading={isAppsLoading}>
          {sortBy(apps, "name").map((app) => (
            <SpaceAppItem app={app} key={app.sId} owner={owner} />
          ))}
        </Tree>
      )}
    </Tree.Item>
  );
};

const SpaceActionsSubMenu = ({
  owner,
  space,
  category,
}: {
  owner: LightWorkspaceType;
  space: SpaceType;
  category: "actions";
}) => {
  const { setNavigationSelection } = usePersistedNavigationSelection();
  const router = useRouter();

  const spaceCategoryPath = `/w/${owner.sId}/spaces/${space.sId}/categories/${category}`;
  const isAncestorToCurrentPage =
    router.asPath.startsWith(spaceCategoryPath + "/") ||
    router.asPath === spaceCategoryPath;

  // Unfold the space's category if it's an ancestor of the current page.
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (isAncestorToCurrentPage) {
      setIsExpanded(isAncestorToCurrentPage);
    }
  }, [isAncestorToCurrentPage]);

  const categoryDetails = CATEGORY_DETAILS[category];

  const { isMCPServerViewsLoading, serverViews } = useMCPServerViews({
    owner,
    space,
  });

  return (
    <Tree.Item
      isNavigatable
      label={categoryDetails.label}
      collapsed={!isExpanded}
      onItemClick={async () => {
        await setNavigationSelection({ lastSpaceId: space.sId });
        void router.push(spaceCategoryPath);
      }}
      isSelected={router.asPath === spaceCategoryPath}
      onChevronClick={() => setIsExpanded(!isExpanded)}
      visual={categoryDetails.icon}
      areActionsFading={false}
      type={isMCPServerViewsLoading || serverViews.length > 0 ? "node" : "leaf"}
    >
      {isExpanded && (
        <Tree isLoading={isMCPServerViewsLoading}>
          {sortBy(serverViews, "server.name").map((serverView) => (
            <SpaceActionItem
              action={serverView}
              key={serverView.server.name}
              owner={owner}
            />
          ))}
        </Tree>
      )}
    </Tree.Item>
  );
};
