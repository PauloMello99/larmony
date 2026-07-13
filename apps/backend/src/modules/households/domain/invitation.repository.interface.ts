import type { HouseholdRole } from "./household.entity";
import type { InvitationEntity } from "./invitation.entity";

export const INVITATION_REPOSITORY = Symbol("INVITATION_REPOSITORY");

export interface CreateInvitationData {
  householdId: string;
  invitedBy: string; // userId of the owner
  email: string;
  role: HouseholdRole;
}

/** Convite + dados da household (para a tela de aceite, resolvido por token). */
export interface InvitationWithHousehold {
  invitation: InvitationEntity;
  householdName: string;
  householdSlug: string;
}

export interface IInvitationRepository {
  create(data: CreateInvitationData): Promise<InvitationEntity>;
  findPendingByHousehold(householdId: string): Promise<InvitationEntity[]>;
  findById(id: string, householdId: string): Promise<InvitationEntity | null>;
  /** Resolve um convite pelo token (com nome/slug da household). Bypassa RLS. */
  findByToken(token: string): Promise<InvitationWithHousehold | null>;
  /** Marca o convite como aceito (status accepted + accepted_at). */
  markAccepted(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  /** Remove o convite (recusa pelo convidado → permite reenviar o fluxo). Bypassa RLS. */
  delete(id: string): Promise<void>;
}
