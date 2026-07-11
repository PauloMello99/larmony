/**
 * Permissões de membro por **módulo** (on/off). O owner sempre tem acesso
 * total (estas permissões só se aplicam a membros não-owner).
 *
 * As chaves espelham os hrefs do nav do frontend para mapeamento direto.
 * TODO(larmony): definir se o v1 mantém permissões por módulo ou só roles
 * owner/member (household tem poucas pessoas) — ver plano da Fase 4.
 */
export const MODULE_KEYS = [] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Membro novo começa sem módulos extras; owner libera conforme necessário. */
export const DEFAULT_EMPLOYEE_PERMISSIONS: ModuleKey[] = [];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

/** Owner tem tudo; membro precisa do módulo na lista de permissões. */
export function hasModuleAccess(
  role: "owner" | "member",
  permissions: readonly string[],
  module: ModuleKey,
): boolean {
  return role === "owner" || permissions.includes(module);
}
