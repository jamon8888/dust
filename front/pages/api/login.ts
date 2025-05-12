import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@auth0/nextjs-auth0";
import config from "@app/lib/api/config";
import type { WithAPIErrorResponse } from "@app/types";
import { apiError, withLogging } from "@app/logger/withlogging";

import {
  CoreAPI,
  ModelProvider,
  Plan,
  Workspace,
  getDataSource,
} from "@dust-tt/types";

import { getMembershipInvitationToken } from "@app/lib/api/invitation";
import { evaluateWorkspaceSeatAvailability } from "@app/lib/api/workspace";
import { AuthFlowError, SSOEnforcedError } from "@app/lib/iam/errors";
import {
  getPendingMembershipInvitationForEmailAndWorkspace,
  getPendingMembershipInvitationForToken,
  getPendingMembershipInvitationWithWorkspaceForEmail,
  markInvitationAsConsumed,
} from "@app/lib/iam/invitations";
import type { SessionWithUser } from "@app/lib/iam/provider";
import { getUserFromSession } from "@app/lib/iam/session";
import { createOrUpdateUser } from "@app/lib/iam/users";
import {
  createWorkspace,
  findWorkspaceWithVerifiedDomain,
} from "@app/lib/iam/workspaces";
import type { MembershipInvitation } from "@app/lib/models/membership_invitation";
import { Workspace as WorkspaceModel } from "@app/lib/models/workspace";
import { MembershipResource } from "@app/lib/resources/membership_resource";
import { SubscriptionResource } from "@app/lib/resources/subscription_resource";
import type { UserResource } from "@app/lib/resources/user_resource";
import { getSignUpUrl } from "@app/lib/signup";
import { ServerSideTracking } from "@app/lib/tracking/server";
import { renderLightWorkspaceType } from "@app/lib/workspace";
import logger from "@app/logger/logger";
import { launchUpdateUsageWorkflow } from "@app/temporal/usage_queue/client";
import { Err, Ok } from "@app/types";

// `membershipInvite` flow: we know we can add the user to the associated `workspaceId` as all the
// checks (decoding the JWT) have been run before. Simply create the membership if it does not
// already exist and mark the invitation as consumed.
async function handleMembershipInvite(
  user: UserResource,
  membershipInvite: MembershipInvitation
): Promise<
  Result<
    {
      flow: null;
      workspace: WorkspaceModel;
    },
    AuthFlowError | SSOEnforcedError
  >
> {
  if (membershipInvite.inviteEmail.toLowerCase() !== user.email.toLowerCase()) {
    logger.error(
      {
        inviteEmail: membershipInvite.inviteEmail,
        workspaceId: membershipInvite.workspaceId,
        user: user.toJSON(),
      },
      "Invitation token email mismatch"
    );

    return new Err(
      new AuthFlowError(
        "invitation_token_email_mismatch",
        "The invitation token is not intended for use with this email address."
      )
    );
  }

  const workspace = await WorkspaceModel.findOne({
    where: {
      id: membershipInvite.workspaceId,
    },
  });

  if (!workspace) {
    return new Err(
      new AuthFlowError(
        "invalid_invitation_token",
        "The invite token is invalid, please ask your admin to resend an invitation."
      )
    );
  }

  if (workspace.ssoEnforced) {
    return new Err(
      new SSOEnforcedError("SSO is enforced on this workspace.", workspace.sId)
    );
  }

  const m = await MembershipResource.getLatestMembershipOfUserInWorkspace({
    user,
    workspace: renderLightWorkspaceType({ workspace }),
  });

  if (m?.isRevoked()) {
    const updateRes = await MembershipResource.updateMembershipRole({
      user,
      workspace: renderLightWorkspaceType({ workspace }),
      newRole: membershipInvite.initialRole,
      allowTerminated: true,
    });

    if (updateRes.isErr()) {
      return new Err(
        new AuthFlowError(
          "membership_update_error",
          `Error updating previously revoked membership: ${updateRes.error.type}`
        )
      );
    }

    void ServerSideTracking.trackUpdateMembershipRole({
      user: user.toJSON(),
      workspace: renderLightWorkspaceType({ workspace }),
      previousRole: updateRes.value.previousRole,
      role: updateRes.value.newRole,
    });
  }

  if (!m) {
    await createAndLogMembership({
      workspace,
      user,
      role: membershipInvite.initialRole,
    });
  }

  await markInvitationAsConsumed(membershipInvite, user);

  return new Ok({ flow: null, workspace });
}

function canJoinTargetWorkspace(
  targetWorkspaceId: string | undefined,
  workspace: WorkspaceModel | undefined,
  activeMemberships: MembershipResource[]
) {
  // If there is no target workspace id, return true.
  if (!targetWorkspaceId) {
    return true;
  }

  if (!workspace) {
    return false;
  }

  // Verify that the user is not already a member of the workspace.
  const alreadyInWorkspace = activeMemberships.find(
    (m) => m.workspaceId === workspace.id
  );
  if (alreadyInWorkspace) {
    return false;
  }

  return targetWorkspaceId === workspace.sId;
}

async function handleEnterpriseSignUpFlow(
  user: UserResource,
  enterpriseConnectionWorkspaceId: string
): Promise<{
  flow: "unauthorized" | null;
  workspace: WorkspaceModel | null;
}> {
  // Combine queries to optimize database calls.
  const [{ total }, workspace] = await Promise.all([
    MembershipResource.getActiveMemberships({
      users: [user],
    }),
    WorkspaceModel.findOne({
      where: {
        sId: enterpriseConnectionWorkspaceId,
      },
    }),
  ]);

  // Early return if user is already a member of a workspace.
  if (total !== 0) {
    return { flow: null, workspace: null };
  }

  // Redirect to login error flow if workspace is not found.
  if (!workspace) {
    return { flow: "unauthorized", workspace: null };
  }

  const membership =
    await MembershipResource.getLatestMembershipOfUserInWorkspace({
      user,
      workspace: renderLightWorkspaceType({ workspace }),
    });

  // Look if there is a pending membership invitation for the user at the workspace.
  const pendingMembershipInvitation =
    await getPendingMembershipInvitationForEmailAndWorkspace(
      user.email,
      workspace.id
    );

  // Initialize membership if it's not present or has been previously revoked. In the case of
  // enterprise connections, Dust access is overridden by the identity management service.
  if (!membership || membership.isRevoked()) {
    await createAndLogMembership({
      workspace,
      user,
      role: pendingMembershipInvitation?.initialRole ?? "user",
    });
  }

  if (pendingMembershipInvitation) {
    await markInvitationAsConsumed(pendingMembershipInvitation, user);
  }

  return { flow: null, workspace };
}

// Regular flow, only if the user is a newly created user. Verify if there's an existing workspace
// with the same verified domain that allows auto-joining. The user will join this workspace if it
// exists; otherwise, a new workspace is created.
async function handleRegularSignupFlow(
  session: SessionWithUser,
  user: UserResource,
  targetWorkspaceId?: string
): Promise<
  Result<
    {
      flow: "no-auto-join" | "revoked" | null;
      workspace: WorkspaceModel | null;
    },
    AuthFlowError | SSOEnforcedError
  >
> {
  const { memberships: activeMemberships, total } =
    await MembershipResource.getActiveMemberships({
      users: [user],
    });

  // Return early if the user is already a member of a workspace and is not attempting to join
  // another one.
  if (total !== 0 && !targetWorkspaceId) {
    return new Ok({
      flow: null,
      workspace: null,
    });
  }

  const workspaceWithVerifiedDomain = await findWorkspaceWithVerifiedDomain(
    session.user
  );
  const { workspace: existingWorkspace } = workspaceWithVerifiedDomain ?? {};

  // Verify that the user is allowed to join the specified workspace.
  const joinTargetWorkspaceAllowed = canJoinTargetWorkspace(
    targetWorkspaceId,
    existingWorkspace,
    activeMemberships
  );
  if (
    workspaceWithVerifiedDomain &&
    existingWorkspace &&
    joinTargetWorkspaceAllowed
  ) {
    if (existingWorkspace.ssoEnforced) {
      return new Err(
        new SSOEnforcedError(
          "SSO is enforced on this workspace.",
          existingWorkspace.sId
        )
      );
    }

    const workspaceSubscription =
      await SubscriptionResource.fetchActiveByWorkspace(
        renderLightWorkspaceType({ workspace: existingWorkspace })
      );
    const hasAvailableSeats = await evaluateWorkspaceSeatAvailability(
      existingWorkspace,
      workspaceSubscription.toJSON()
    );
    // Redirect to existing workspace if no seats available, requiring an invite.
    if (
      !hasAvailableSeats ||
      workspaceWithVerifiedDomain.domainAutoJoinEnabled === false
    ) {
      return new Ok({ flow: "no-auto-join", workspace: null });
    }

    const m = await MembershipResource.getLatestMembershipOfUserInWorkspace({
      user,
      workspace: renderLightWorkspaceType({ workspace: existingWorkspace }),
    });

    if (m?.isRevoked()) {
      return new Ok({ flow: "revoked", workspace: null });
    }

    if (!m) {
      await createAndLogMembership({
        workspace: existingWorkspace,
        user,
        role: "user",
      });
    }

    return new Ok({ flow: null, workspace: existingWorkspace });
  } else if (!targetWorkspaceId) {
    const workspace = await createWorkspace(session);
    await createAndLogMembership({
      workspace,
      user,
      role: "admin",
    });

    return new Ok({ flow: null, workspace });
  } else if (targetWorkspaceId && !canJoinTargetWorkspace) {
    return new Err(
      new AuthFlowError(
        "invalid_domain",
        "The domain attached to your email address is not authorized to join this workspace."
      )
    );
  } else {
    // Redirect the user to their existing workspace if they are not allowed to join the target
    // workspace.
    return new Ok({ flow: null, workspace: null });
  }
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WithAPIErrorResponse<void>>
): Promise<void> {
  const session = await getSession(req, res);
  
  // Traitement différent selon la méthode HTTP
  if (req.method === "GET") {
    // Si l'utilisateur n'est pas authentifié, on affiche la page de login
    if (!session) {
      res.redirect("/login");
      return;
    }

    const { inviteToken, wId } = req.query;
    const targetWorkspaceId = typeof wId === "string" ? wId : undefined;
    // Auth0 flow augments token with a claim for workspace id linked to the enterprise connection.
    const enterpriseConnectionWorkspaceId =
      session.user["https://dust.tt/workspaceId"];

    let targetWorkspace: WorkspaceModel | null = null;
    // `members` scope augments token with the list of all workspaces the user is a member of. If present
    // we use it to validate target workspace claims.
    const dataSource = getDataSource();
    const coreAPI = new CoreAPI(config.getCoreAPIConfig());

    if (targetWorkspaceId) {
      const workspace = await dataSource.getWorkspace(targetWorkspaceId);
      if (workspace) {
        const membership = await dataSource.getUserMembership(
          workspace.id,
          session.user.sub
        );
        if (membership) {
          targetWorkspace = workspace;
        }
      }
    } else if (enterpriseConnectionWorkspaceId) {
      // Verify the workspace exists.
      const workspace = await dataSource.getWorkspace(
        enterpriseConnectionWorkspaceId
      );
      if (workspace) {
        targetWorkspace = workspace;
      }
    } else if (inviteToken && typeof inviteToken === "string") {
      try {
        const inviteRes = await coreAPI.getInviteFromToken({
          inviteToken,
        });
        if (inviteRes.isOk() && inviteRes.value.invite) {
          const workspace = await dataSource.getWorkspace(
            inviteRes.value.invite.workspaceId
          );
          if (workspace) {
            targetWorkspace = workspace;
          }
        }
      } catch (e) {
        console.error("Failed to verify invite token:", e);
      }
    }

    if (targetWorkspace) {
      res.redirect(`/w/${targetWorkspace.sId}`);
      return;
    }

    // If we got here, no workspace to target, so send to the first one or create a new one
    // if the user is not a member of any workspace.
    const workspaces = await dataSource.listUserMemberships(session.user.sub);
    if (workspaces.length > 0) {
      res.redirect(`/w/${workspaces[0].sId}`);
      return;
    }

    // No workspaces found: we create and setup a new one for the user.
    try {
      const newWorkspaceRes = await coreAPI.createWorkspace({
        name: session.user.name || "My Workspace",
        plan: Plan.Free,
        type: "personal",
        creatorUserId: session.user.sub,
        enabledModelProviders: [ModelProvider.OpenAI, ModelProvider.Anthropic],
      });

      if (newWorkspaceRes.isErr()) {
        console.error(
          "Error creating workspace:",
          newWorkspaceRes.error.message
        );
        res.redirect("/login-error");
        return;
      }
      const newWorkspace = newWorkspaceRes.value.workspace;

      res.redirect(`/w/${newWorkspace.sId}`);
    } catch (err) {
      console.error("Error creating a workspace for the user:", err);
      res.redirect("/login-error");
    }
  } else if (req.method === "POST") {
    // Traitement de la requête POST pour l'authentification
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return apiError(req, res, {
          status_code: 400,
          api_error: {
            type: "invalid_request_error",
            message: "Email and password are required",
          },
        });
      }
      
      // Appel à notre nouvel endpoint d'authentification
      const authResponse = await fetch(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/auth/oauth-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        return apiError(req, res, {
          status_code: authResponse.status,
          api_error: {
            type: "authentication_error",
            message: errorData.error?.message || "Authentication failed",
          },
        });
      }
      
      // Si l'authentification réussit, créer une session et rediriger
      const data = await authResponse.json();
      
      // En production, il faudrait utiliser Auth0 pour créer une vraie session
      // Pour le moment, on redirige simplement vers la page principale
      res.setHeader("Location", "/w");
      res.status(302).end();
      
    } catch (error) {
      console.error("Authentication error:", error);
      return apiError(req, res, {
        status_code: 500,
        api_error: {
          type: "internal_server_error",
          message: "An error occurred during authentication",
        },
      });
    }
  } else {
    // Méthode HTTP non supportée
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({
      error: {
        type: "method_not_allowed",
        message: `Method ${req.method} Not Allowed`,
      },
    });
  }
}

export async function createAndLogMembership({
  user,
  workspace,
  role,
}: {
  user: UserResource;
  workspace: WorkspaceModel;
  role: ActiveRoleType;
}) {
  const m = await MembershipResource.createMembership({
    role,
    user,
    workspace: renderLightWorkspaceType({ workspace }),
  });

  void ServerSideTracking.trackCreateMembership({
    user: user.toJSON(),
    workspace: renderLightWorkspaceType({ workspace }),
    role: m.role,
    startAt: m.startAt,
  });

  // Update workspace subscription usage when a new user joins.
  await launchUpdateUsageWorkflow({ workspaceId: workspace.sId });

  return m;
}

export default withLogging(handler);
