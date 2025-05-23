import { assertNever } from "@dust-tt/client";

import {
  getBrandInternalId,
  getCategoryInternalId,
  getHelpCenterInternalId,
  getIdsFromInternalId,
  getTicketsInternalId,
} from "@connectors/connectors/zendesk/lib/id_conversions";
import { getZendeskSubdomainAndAccessToken } from "@connectors/connectors/zendesk/lib/zendesk_access_token";
import {
  fetchZendeskBrand,
  getZendeskBrandSubdomain,
  listZendeskBrands,
  listZendeskCategories,
} from "@connectors/connectors/zendesk/lib/zendesk_api";
import type { ConnectorResource } from "@connectors/resources/connector_resource";
import {
  ZendeskArticleResource,
  ZendeskBrandResource,
  ZendeskCategoryResource,
  ZendeskTicketResource,
} from "@connectors/resources/zendesk_resources";
import type {
  ConnectorPermission,
  ContentNode,
  ContentNodesViewType,
  ModelId,
} from "@connectors/types";
import { INTERNAL_MIME_TYPES } from "@connectors/types";

/**
 * Retrieve all nodes selected by the admin when setting permissions.
 */
export async function retrieveAllSelectedNodes(
  connectorId: ModelId
): Promise<ContentNode[]> {
  const brands = await ZendeskBrandResource.fetchAllReadOnly(connectorId);
  const brandsWithHelpCenter = brands.filter(
    (brand) => brand.helpCenterPermission === "read"
  );

  const helpCenterNodes: ContentNode[] = brandsWithHelpCenter.map((brand) =>
    brand.getHelpCenterContentNode(connectorId, { richTitle: true })
  );

  const ticketNodes: ContentNode[] = brands
    .filter((brand) => brand.ticketsPermission === "read")
    .map((brand) =>
      brand.getTicketsContentNode(connectorId, {
        expandable: true,
        richTitle: true,
      })
    );

  const categories =
    await ZendeskCategoryResource.fetchAllReadOnly(connectorId);
  const categoryNodes: ContentNode[] = categories.map((category) =>
    category.toContentNode(connectorId, { expandable: true })
  );

  return [...helpCenterNodes, ...ticketNodes, ...categoryNodes];
}

/**
 * Retrieves the Brand content nodes, which populate the root level.
 */
async function getRootLevelContentNodes({
  connectorId,
  isReadPermissionsOnly,
  subdomain,
  accessToken,
}: {
  connectorId: ModelId;
  isReadPermissionsOnly: boolean;
  subdomain: string;
  accessToken: string;
}): Promise<ContentNode[]> {
  const brandsInDatabase =
    await ZendeskBrandResource.fetchAllReadOnly(connectorId);
  if (isReadPermissionsOnly) {
    return [
      ...brandsInDatabase
        .filter((b) => b.ticketsPermission === "read")
        .map((b) => b.getTicketsContentNode(connectorId, { richTitle: true })),
      ...brandsInDatabase
        .filter((b) => b.helpCenterPermission === "read")
        .map((b) =>
          b.getHelpCenterContentNode(connectorId, { richTitle: true })
        ),
    ];
  } else {
    const brands = await listZendeskBrands({ subdomain, accessToken });
    return brands.map(
      (brand) =>
        brandsInDatabase
          .find((b) => b.brandId === brand.id)
          ?.toContentNode(connectorId) ?? {
          internalId: getBrandInternalId({ connectorId, brandId: brand.id }),
          parentInternalId: null,
          type: "folder",
          title: brand.name || "Brand",
          sourceUrl: brand.brand_url,
          expandable: true,
          permission: "none",
          lastUpdatedAt: null,
          mimeType: INTERNAL_MIME_TYPES.ZENDESK.BRAND,
        }
    );
  }
}

/**
 * Retrieves the two children node of a Brand, one for its tickets and one for its help center.
 */
async function getBrandChildren({
  connectorId,
  brandId,
  isReadPermissionsOnly,
  parentInternalId,
  subdomain,
  accessToken,
}: {
  connectorId: ModelId;
  brandId: number;
  parentInternalId: string;
  isReadPermissionsOnly: boolean;
  subdomain: string;
  accessToken: string;
}): Promise<ContentNode[]> {
  const nodes = [];
  const brandInDb = await ZendeskBrandResource.fetchByBrandId({
    connectorId,
    brandId,
  });

  // fetching the brand to check whether it has an enabled Help Center
  const fetchedBrand = await fetchZendeskBrand({
    subdomain,
    accessToken,
    brandId,
  });
  if (!fetchedBrand) {
    throw new Error(`Brand not found: ${brandId}`);
  }

  if (isReadPermissionsOnly) {
    if (brandInDb?.ticketsPermission === "read") {
      nodes.push(
        brandInDb.getTicketsContentNode(connectorId, { expandable: true })
      );
    }
    if (
      fetchedBrand.has_help_center &&
      brandInDb?.helpCenterPermission === "read"
    ) {
      nodes.push(brandInDb.getHelpCenterContentNode(connectorId));
    }
  } else {
    const ticketsNode: ContentNode = brandInDb?.getTicketsContentNode(
      connectorId
    ) ?? {
      internalId: getTicketsInternalId({ connectorId, brandId }),
      parentInternalId: parentInternalId,
      type: "folder",
      title: "Tickets",
      sourceUrl: null,
      expandable: false,
      permission: "none",
      lastUpdatedAt: null,
      mimeType: INTERNAL_MIME_TYPES.ZENDESK.TICKETS,
    };
    nodes.push(ticketsNode);

    // only displaying the Help Center node if the brand has an enabled Help Center
    if (fetchedBrand.has_help_center) {
      const helpCenterNode: ContentNode = brandInDb?.getHelpCenterContentNode(
        connectorId
      ) ?? {
        internalId: getHelpCenterInternalId({
          connectorId,
          brandId,
        }),
        parentInternalId: parentInternalId,
        type: "folder",
        title: "Help Center",
        sourceUrl: null,
        expandable: true,
        permission: "none",
        lastUpdatedAt: null,
        mimeType: INTERNAL_MIME_TYPES.ZENDESK.HELP_CENTER,
      };
      nodes.push(helpCenterNode);
    }
  }
  return nodes;
}

/**
 * Retrieves the children nodes of a Help Center, which are the categories.
 */
async function getHelpCenterChildren({
  connectorId,
  brandId,
  isReadPermissionsOnly,
  parentInternalId,
  subdomain,
  accessToken,
}: {
  connectorId: ModelId;
  brandId: number;
  parentInternalId: string;
  isReadPermissionsOnly: boolean;
  subdomain: string;
  accessToken: string;
}): Promise<ContentNode[]> {
  const categoriesInDatabase = await ZendeskCategoryResource.fetchByBrandId({
    connectorId,
    brandId,
  });
  if (isReadPermissionsOnly) {
    return categoriesInDatabase.map((category) =>
      category.toContentNode(connectorId, { expandable: true })
    );
  } else {
    const brandSubdomain = await getZendeskBrandSubdomain({
      connectorId,
      brandId,
      subdomain,
      accessToken,
    });

    const categories = await listZendeskCategories({
      accessToken,
      brandSubdomain,
    });

    return categories.map(
      (category) =>
        categoriesInDatabase
          .find((c) => c.categoryId === category.id)
          ?.toContentNode(connectorId) ?? {
          internalId: getCategoryInternalId({
            connectorId,
            brandId,
            categoryId: category.id,
          }),
          parentInternalId: parentInternalId,
          type: "folder",
          title: category.name,
          sourceUrl: category.html_url,
          expandable: false,
          permission: "none",
          lastUpdatedAt: null,
          mimeType: INTERNAL_MIME_TYPES.ZENDESK.CATEGORY,
        }
    );
  }
}

/**
 * Retrieves the children nodes of a node identified by its internal ID.
 */
export async function retrieveChildrenNodes({
  connector,
  parentInternalId,
  filterPermission,
}: {
  connector: ConnectorResource;
  parentInternalId: string | null;
  filterPermission: ConnectorPermission | null;
  viewType: ContentNodesViewType;
}): Promise<ContentNode[]> {
  const { subdomain, accessToken } = await getZendeskSubdomainAndAccessToken(
    connector.connectionId
  );
  const isReadPermissionsOnly = filterPermission === "read";

  if (!parentInternalId) {
    return getRootLevelContentNodes({
      subdomain,
      accessToken,
      connectorId: connector.id,
      isReadPermissionsOnly,
    });
  }
  const { type, objectIds } = getIdsFromInternalId(
    connector.id,
    parentInternalId
  );
  switch (type) {
    case "brand": {
      return getBrandChildren({
        connectorId: connector.id,
        brandId: objectIds.brandId,
        isReadPermissionsOnly,
        parentInternalId,
        subdomain,
        accessToken,
      });
    }
    case "help-center": {
      return getHelpCenterChildren({
        connectorId: connector.id,
        brandId: objectIds.brandId,
        isReadPermissionsOnly,
        parentInternalId,
        subdomain,
        accessToken,
      });
    }
    // If the parent is a brand's tickets, we retrieve the list of tickets for the brand.
    case "tickets": {
      if (isReadPermissionsOnly) {
        const ticketsInDb = await ZendeskTicketResource.fetchByBrandId({
          connectorId: connector.id,
          brandId: objectIds.brandId,
        });
        return ticketsInDb.map((ticket) => ticket.toContentNode(connector.id));
      }
      return [];
    }
    // If the parent is a category, we retrieve the list of articles for this category.
    case "category": {
      if (isReadPermissionsOnly) {
        const articlesInDb = await ZendeskArticleResource.fetchByCategoryId({
          connectorId: connector.id,
          ...objectIds,
        });
        return articlesInDb.map((article) =>
          article.toContentNode(connector.id)
        );
      }
      return [];
    }
    // Single tickets and articles have no children.
    case "ticket":
    case "article":
      return [];
    default:
      assertNever(type);
  }
}
