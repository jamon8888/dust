import { useSendNotification } from "@dust-tt/sparkle";
import { useMemo } from "react";
import type { Fetcher } from "swr";

import { fetcher, useSWRWithDefaults } from "@app/lib/swr/swr";
import type { GetTagsResponseBody } from "@app/pages/api/w/[wId]/tags";
import type { LightWorkspaceType } from "@app/types";
import type { TagType } from "@app/types/tag";

export function useTags({
  owner,
  disabled,
}: {
  owner: LightWorkspaceType;
  disabled?: boolean;
}) {
  const tagsFetcher: Fetcher<GetTagsResponseBody> = fetcher;

  const { data, error, mutate } = useSWRWithDefaults(
    `/api/w/${owner.sId}/tags`,
    tagsFetcher,
    {
      disabled,
    }
  );

  return {
    tags: useMemo(() => (data ? data.tags : []), [data]),
    isTagsLoading: !error && !data && !disabled,
    isTagsError: !!error,
    mutateTags: mutate,
  };
}

export function useCreateTag({ owner }: { owner: LightWorkspaceType }) {
  const sendNotification = useSendNotification();
  const { mutateTags } = useTags({ owner, disabled: true });

  const createTag = async (name: string): Promise<TagType | null> => {
    const res = await fetch(`/api/w/${owner.sId}/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const json = await res.json();
      sendNotification({
        type: "error",
        title: "Failed to create tag",
        description: json.error.message || "Failed to create tag",
      });

      return null;
    }

    void mutateTags();
    const json = await res.json();
    return json.tag;
  };

  return {
    createTag,
  };
}
