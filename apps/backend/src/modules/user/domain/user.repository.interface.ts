import { CreateUserData, UpdateUserData, UserEntity } from "./user.entity";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface IUserRepository {
  findByAuthId(authId: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  /** Busca por e-mail (case-insensitive). Bypassa RLS. */
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(authId: string, data: UpdateUserData): Promise<UserEntity>;
  /**
   * Faz merge (jsonb `||`) do patch no mapa `onboarding` do usuário — atômico,
   * sem read-modify-write. Ex.: `{ sidebar: 1 }`.
   */
  mergeOnboarding(
    authId: string,
    patch: Record<string, number>,
  ): Promise<UserEntity>;
  /** Grava o aceite de uma nova versão dos Termos/Privacidade (re-aceite). */
  acceptTerms(authId: string, version: string): Promise<UserEntity>;
  /** Remove o registro do usuário (exclusão de conta). Bypassa RLS. */
  delete(authId: string): Promise<void>;
  /**
   * Vincula uma NOVA identidade de auth (Supabase auth_id) a um usuário local
   * já existente — caminho de merge do login social (ADR-0032 adendo).
   * Idempotente (onConflictDoNothing por auth_id). Bypassa RLS (admin).
   */
  linkIdentity(
    userId: string,
    provider: AuthIdentityProvider,
    authId: string,
  ): Promise<void>;
  /**
   * Lista os auth_id de TODAS as identidades vinculadas a um usuário (senha,
   * Google, Apple) — usado na exclusão de conta pra limpar todas no provedor,
   * não só a da sessão atual (ADR-0032 adendo, múltiplas identidades).
   */
  listIdentityAuthIds(userId: string): Promise<string[]>;
}

/** Provedores de identidade suportados em user_identities.provider (enum do banco). */
export type AuthIdentityProvider = "password" | "google" | "apple";
