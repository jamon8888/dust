import type { Fetcher } from "swr";

import { fetcher, useSWRWithDefaults } from "@app/lib/swr/swr";
import type { GetDataSourceUsageResponseBody } from "@app/pages/api/w/[wId]/data_sources/[dsId]/usage";
import type {
  DataSourceType,
  GetPostNotionSyncResponseBody,
  LightWorkspaceType,
} from "@app/types";

export function useDataSourceUsage({
  owner,
  dataSource,
}: {
  owner: LightWorkspaceType;
  dataSource: DataSourceType;
}) {
  const usageFetcher: Fetcher<GetDataSourceUsageResponseBody> = fetcher;
  const { data, error, mutate } = useSWRWithDefaults(
    `/api/w/${owner.sId}/data_sources/${dataSource.sId}/usage`,
    usageFetcher
  );

  return {
    usage: data?.usage ?? null,
    isUsageLoading: !error && !data,
    isUsageError: error,
    mutate,
  };
}

export function useNotionLastSyncedUrls({
  owner,
  dataSource,
}: {
  owner: LightWorkspaceType;
  dataSource: DataSourceType;
}): {
  lastSyncedUrls: GetPostNotionSyncResponseBody["syncResults"];
  isLoading: boolean;
  isError: boolean;
  mutate: () => Promise<void>;
} {
  const { data, error, mutate, isLoading } = useSWRWithDefaults(
    `/api/w/${owner.sId}/data_sources/${dataSource.sId}/managed/notion_url_sync`,
    fetcher
  );

  return {
    lastSyncedUrls: data?.syncResults,
    isLoading,
    isError: error,
    mutate,
  };
}
