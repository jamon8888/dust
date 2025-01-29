import { faker } from "@faker-js/faker";
import type { InferCreationAttributes } from "sequelize";

import { UserModel } from "@app/lib/resources/storage/models/user";
import { generateRandomModelSId } from "@app/lib/resources/string_ids";

import { Factory } from "./factories";

class UserFactory extends Factory<UserModel> {
  constructor() {
    super({
      sId: generateRandomModelSId(),
      auth0Sub: faker.string.uuid(),
      provider: "google",
      providerId: faker.string.uuid(),

      username: faker.internet.displayName(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),

      isDustSuperUser: false,
    });
  }

  async make(params: InferCreationAttributes<UserModel>) {
    return UserModel.create(params);
  }

  basic() {
    return this.params({});
  }

  superUser() {
    return this.params({
      isDustSuperUser: true,
    });
  }

  withCreatedAt(createdAt: Date) {
    return this.params({
      sId: generateRandomModelSId(),
      auth0Sub: faker.string.uuid(),
      provider: "google",
      providerId: faker.string.uuid(),

      username: faker.internet.displayName(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      createdAt,
    });
  }
}

export const userFactory = () => {
  return new UserFactory();
};
