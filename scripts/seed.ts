import { UserResource } from "../front/lib/resources/user_resource";
import { Workspace } from "../front/lib/models/workspace";
import { MembershipResource } from "../front/lib/resources/membership_resource";
import { GroupResource } from "../front/lib/resources/group_resource";
import { KeyResource } from "../front/lib/resources/key_resource";
import { renderLightWorkspaceType } from "../front/lib/workspace";

async function main() {
  // 1. Créer un user
  const user = await UserResource.makeNew({
    email: "admin@dust.tt",
    name: "Admin Local",
    username: "adminlocal",
    firstName: "Admin",
    lastName: "Local",
    provider: "local",
    auth0Sub: null,
  });
  const userJson = user.toJSON();

  // 2. Créer un workspace (Sequelize natif)
  const workspace = await Workspace.create({
    sId: "localworkspace",
    name: "Local Workspace",
    description: "Workspace de test local",
    segmentation: null,
    whiteListedProviders: null,
    defaultEmbeddingProvider: null,
    metadata: null,
    conversationsRetentionDays: null,
    ssoEnforced: false,
  });

  // 3. Créer les groupes par défaut pour le workspace
  const lightWorkspace = renderLightWorkspaceType({ workspace });
  const { globalGroup } = await GroupResource.makeDefaultsForWorkspace(
    lightWorkspace
  );

  // 4. Ajouter le user comme admin du workspace
  await MembershipResource.createMembership({
    user,
    workspace: lightWorkspace,
    role: "admin",
  });

  // 5. Générer une API key pour ce user/workspace (groupe global)
  const key = await KeyResource.makeNew(
    {
      userId: userJson.id,
      workspaceId: workspace.id,
      isSystem: false,
      status: "active",
      name: "Clé admin locale",
    },
    globalGroup
  );
  const keyJson = key.toJSON();

  console.log("User:", userJson.email);
  console.log("Workspace:", workspace.sId);
  console.log("API Key:", keyJson.secret);
}

main().catch(console.error);