import type { Result } from "@dust-tt/types";
import { Err, Ok } from "@dust-tt/types";
import type {
  Attributes,
  CreationAttributes,
  ModelStatic,
  Transaction,
} from "sequelize";

import { BaseResource } from "@app/lib/resources/base_resource";
import { TemplateModel } from "@app/lib/resources/storage/models/templates";
import type { ReadonlyAttributesType } from "@app/lib/resources/storage/types";

// Attributes are marked as read-only to reflect the stateless nature of our Resource.
// This design will be moved up to BaseResource once we transition away from Sequelize.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TemplateResource
  extends ReadonlyAttributesType<TemplateModel> {}
export class TemplateResource extends BaseResource<TemplateModel> {
  static model: ModelStatic<TemplateModel> = TemplateModel;

  constructor(
    model: ModelStatic<TemplateModel>,
    blob: Attributes<TemplateModel>
  ) {
    super(TemplateModel, blob);
  }

  static async makeNew(blob: CreationAttributes<TemplateModel>) {
    const template = await TemplateModel.create({
      ...blob,
    });

    return new this(TemplateModel, template.get());
  }

  // TODO(2024-03-27 flav) Move this to the `BaseResource`.
  static async fetchByExternalId(
    sId: string,
    transaction?: Transaction
  ): Promise<TemplateResource | null> {
    const blob = await this.model.findOne({
      where: {
        sId,
      },
      transaction,
    });
    if (!blob) {
      return null;
    }

    // Use `.get` to extract model attributes, omitting Sequelize instance metadata.
    return new TemplateResource(this.model, blob.get());
  }

  static async listAllPublished() {
    const blobs = await TemplateResource.model.findAll({
      where: {
        visibility: "published",
      },
    });

    return blobs.map(
      // Use `.get` to extract model attributes, omitting Sequelize instance metadata.
      (b) => new TemplateResource(this.model, b.get())
    );
  }

  async delete(transaction?: Transaction): Promise<Result<undefined, Error>> {
    try {
      await this.model.destroy({
        where: {
          id: this.id,
        },
        transaction,
      });

      return new Ok(undefined);
    } catch (err) {
      return new Err(err as Error);
    }
  }

  isPublished() {
    return this.visibility === "published";
  }

  toListJSON() {
    return {
      description: this.description,
      name: this.name,
      sId: this.sId,
      tags: this.tags,
    };
  }

  toJSON() {
    return {
      description: this.description,
      helpActions: this.helpActions,
      helpInstructions: this.helpInstructions,
      name: this.name,
      presetAction: this.presetAction,
      presetDescription: this.presetDescription,
      presetHandle: this.presetHandle,
      presetInstructions: this.presetInstructions,
      presetModelId: this.presetModelId,
      presetProviderId: this.presetProviderId,
      presetTemperature: this.presetTemperature,
      sId: this.sId,
      tags: this.tags,
    };
  }
}
