import { getConnectorProviderLogoWithFallback } from "@app/shared/lib/connector_providers";
import {
  getLocationForDataSourceViewContentNode,
  getVisualForDataSourceViewContentNode,
} from "@app/shared/lib/content_nodes";
import type { FileUploaderService } from "@app/ui/hooks/useFileUploaderService";
import type { DataSourceViewContentNodeType } from "@dust-tt/client";
import { isFolder, isWebsite } from "@dust-tt/client";
import {
  Citation,
  CitationClose,
  CitationDescription,
  CitationIcons,
  CitationImage,
  CitationTitle,
  DocumentIcon,
  Icon,
  ImageIcon,
  Tooltip,
} from "@dust-tt/sparkle";
import { useMemo } from "react";

type FileAttachment = {
  type: "file";
  id: string;
  title: string;
  preview?: string;
  isUploading: boolean;
  onRemove: () => void;
};

type NodeAttachment = {
  type: "node";
  id: string;
  title: string;
  spaceName: string;
  spaceIcon: React.ComponentType;
  visual: React.ReactNode;
  path: string;
  onRemove: () => void;
};

type Attachment = FileAttachment | NodeAttachment;

interface FileAttachmentsProps {
  service: FileUploaderService;
}

interface NodeAttachmentsProps {
  items: DataSourceViewContentNodeType[];
  spacesMap: {
    [k: string]: {
      name: string;
      icon: React.ComponentType;
    };
  };
  onRemove: (node: DataSourceViewContentNodeType) => void;
}
interface InputBarAttachmentsProps {
  files?: FileAttachmentsProps;
  nodes?: NodeAttachmentsProps;
}

export function InputBarAttachments({
  files,
  nodes,
}: InputBarAttachmentsProps) {
  const fileAttachments: FileAttachment[] = useMemo(() => {
    return (
      files?.service.fileBlobs.map((blob) => ({
        type: "file",
        id: blob.id,
        title: blob.id,
        preview: blob.preview,
        isUploading: blob.isUploading,
        onRemove: () => files.service.removeFile(blob.id),
      })) || []
    );
  }, [files?.service]);

  const nodeAttachments: NodeAttachment[] = useMemo(() => {
    return (
      nodes?.items.map((node) => {
        const logo = getConnectorProviderLogoWithFallback({
          provider: node.dataSourceView.dataSource.connectorProvider,
        });

        const nodeId = node.internalId ?? `node-${node.internalId}`;
        const spaceName =
          nodes.spacesMap[node.dataSourceView.spaceId].name ?? "Unknown Space";
        const { dataSource } = node.dataSourceView;
        return {
          type: "node",
          id: nodeId,
          title: node.title,
          spaceName,
          spaceIcon: nodes.spacesMap[node.dataSourceView.spaceId].icon,
          path: getLocationForDataSourceViewContentNode(node),
          visual:
            isWebsite(dataSource) || isFolder(dataSource) ? (
              <Icon visual={logo} size="sm" />
            ) : (
              <>
                {getVisualForDataSourceViewContentNode(node)({
                  className: "h-5 w-5",
                })}
                <Icon visual={logo} size="sm" />
              </>
            ),
          onRemove: () => nodes.onRemove(node),
        };
      }) || []
    );
  }, [nodes]);

  const allAttachments: Attachment[] = [...fileAttachments, ...nodeAttachments];

  if (allAttachments.length === 0) {
    return null;
  }

  return (
    <div className="mr-3 flex gap-2 overflow-auto border-b border-separator pb-3">
      {allAttachments.map((attachment) => {
        const isFile = attachment.type === "file";

        return (
          <Tooltip
            key={`${attachment.type}-${attachment.id}`}
            tooltipTriggerAsChild
            trigger={
              <Citation
                className="w-40"
                isLoading={attachment.type === "file" && attachment.isUploading}
                action={
                  <CitationClose
                    onClick={(e) => {
                      e.stopPropagation();
                      attachment.onRemove();
                    }}
                  />
                }
              >
                {isFile && attachment.preview && (
                  <CitationImage imgSrc={attachment.preview} />
                )}

                <CitationIcons>
                  {isFile ? (
                    <Icon
                      visual={attachment.preview ? ImageIcon : DocumentIcon}
                    />
                  ) : (
                    attachment.visual
                  )}
                </CitationIcons>

                <CitationTitle className="truncate text-ellipsis">
                  {attachment.title}
                </CitationTitle>

                {!isFile && (
                  <CitationDescription className="truncate text-ellipsis">
                    <div className="flex items-center gap-1">
                      <span>{attachment.spaceName}</span>
                    </div>
                  </CitationDescription>
                )}
              </Citation>
            }
            label={
              attachment.type === "file" ? (
                attachment.title
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="font-bold">{attachment.title}</div>
                  <div className="flex gap-1 pt-1 text-sm">
                    <Icon visual={attachment.spaceIcon} />
                    <p>{attachment.spaceName}</p>
                  </div>
                  <div className="text-sm text-muted-foreground dark:text-muted-foreground-night">
                    {attachment.path}
                  </div>
                </div>
              )
            }
          />
        );
      })}
    </div>
  );
}
