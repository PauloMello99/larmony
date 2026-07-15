import { capabilitiesFor, CAPABILITIES } from "./entitlements";

describe("entitlements domain (M16 — 2 tiers)", () => {
  it("locked não tem nenhuma capability habilitada", () => {
    const caps = capabilitiesFor("locked");
    for (const c of CAPABILITIES) expect(caps[c]).toBe(false);
  });

  it("essencial não tem nenhuma capability avançada (só núcleo, não gateado)", () => {
    const caps = capabilitiesFor("essencial");
    for (const c of CAPABILITIES) expect(caps[c]).toBe(false);
  });

  it("completo tem todas as capabilities habilitadas", () => {
    const caps = capabilitiesFor("completo");
    for (const c of CAPABILITIES) expect(caps[c]).toBe(true);
  });

  it("as features avançadas (orçamentos/lançamentos/relatórios/export/categorias) são Completo-only", () => {
    expect(capabilitiesFor("essencial").budgets).toBe(false);
    expect(capabilitiesFor("essencial").scheduled_entries).toBe(false);
    expect(capabilitiesFor("completo").budgets).toBe(true);
    expect(capabilitiesFor("completo").scheduled_entries).toBe(true);
  });
});
