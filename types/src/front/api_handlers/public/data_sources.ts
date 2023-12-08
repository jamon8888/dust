import { CoreAPIDataSourceDocumentSection } from "core/data_source";
import * as t from "io-ts";

const UpsertContextSchema = t.type({
  sync_type: t.union([
    t.literal("batch"),
    t.literal("incremental"),
    t.undefined,
  ]),
});

export type UpsertContext = t.TypeOf<typeof UpsertContextSchema>;

const Section: t.RecursiveType<
  t.Type<CoreAPIDataSourceDocumentSection>,
  CoreAPIDataSourceDocumentSection
> = t.recursion("Section", () =>
  t.type({
    prefix: t.union([t.string, t.null]),
    content: t.union([t.string, t.null]),
    sections: t.array(Section),
  })
);

export const PostDataSourceDocumentRequestBodySchema = t.type({
  timestamp: t.union([t.number, t.undefined, t.null]),
  tags: t.union([t.array(t.string), t.undefined, t.null]),
  parents: t.union([t.array(t.string), t.undefined, t.null]),
  source_url: t.union([t.string, t.undefined, t.null]),
  upsert_context: t.union([UpsertContextSchema, t.undefined, t.null]),
  text: t.union([t.string, t.undefined, t.null]),
  section: t.union([Section, t.undefined, t.null]),
  light_document_output: t.union([t.boolean, t.undefined]),
});

export type PostDataSourceDocumentRequestBody = t.TypeOf<
  typeof PostDataSourceDocumentRequestBodySchema
>;
