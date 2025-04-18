import { DocumentIcon } from "@dust-tt/sparkle";

import type { MarkdownCitation } from "@app/components/markdown/MarkdownCitation";
import { getCitationIcon } from "@app/components/markdown/MarkdownCitation";
import type { RetrievalDocumentType } from "@app/lib/actions/retrieval";
import { getConnectorProviderLogoWithFallback } from "@app/lib/connector_providers";
import type { ConnectorProvider } from "@app/types";
import { isConnectorProvider } from "@app/types";

type ConnectorProviderDocumentType =
  | Exclude<ConnectorProvider, "webcrawler">
  | "document";

export function getProviderFromRetrievedDocument(
  document: RetrievalDocumentType
): ConnectorProviderDocumentType {
  if (document.dataSourceView) {
    if (document.dataSourceView.dataSource.connectorProvider === "webcrawler") {
      return "document";
    }
    return document.dataSourceView.dataSource.connectorProvider || "document";
  }
  return "document";
}

export function getTitleFromRetrievedDocument(
  document: RetrievalDocumentType
): string {
  const provider = getProviderFromRetrievedDocument(document);

  if (provider === "slack") {
    for (const t of document.tags) {
      if (t.startsWith("channelName:")) {
        return `#${t.substring(12)}`;
      }
    }
  }

  for (const t of document.tags) {
    if (t.startsWith("title:")) {
      return t.substring(6);
    }
  }

  return document.documentId;
}

export function makeDocumentCitation(
  document: RetrievalDocumentType,
  isDark?: boolean
): MarkdownCitation {
  const IconComponent = getCitationIcon(
    getProviderFromRetrievedDocument(document),
    isDark
  );
  return {
    href: document.sourceUrl ?? undefined,
    title: getTitleFromRetrievedDocument(document),
    icon: <IconComponent />,
  };
}

export function makeDocumentCitations(
  documents: RetrievalDocumentType[],
  isDark?: boolean
): MarkdownCitation[] {
  return documents.map((document) => makeDocumentCitation(document, isDark));
}

export function getDocumentIcon(provider: string | null | undefined) {
  if (provider && isConnectorProvider(provider)) {
    const IconComponent = getConnectorProviderLogoWithFallback({
      provider,
      fallback: DocumentIcon,
    });
    return <IconComponent />;
  }
  return <DocumentIcon />;
}
