import { capabilitiesFor, limitsFor, CAPABILITIES } from "./entitlements";

describe("entitlements domain", () => {
  it("free não tem nenhuma capability habilitada", () => {
    const caps = capabilitiesFor("free");
    for (const c of CAPABILITIES) expect(caps[c]).toBe(false);
  });

  it("premium tem todas as capabilities habilitadas", () => {
    const caps = capabilitiesFor("premium");
    for (const c of CAPABILITIES) expect(caps[c]).toBe(true);
  });

  it("custom (comp) recebe o mesmo que premium", () => {
    expect(capabilitiesFor("custom")).toEqual(capabilitiesFor("premium"));
  });

  it("free tem os limites da régua (1 lar / 2 membros / 3 metas / 3 orçamentos)", () => {
    const limits = limitsFor("free");
    expect(limits).toEqual({
      maxHouseholdsOwned: 1,
      maxMembersPerHousehold: 2,
      maxActiveGoals: 3,
      maxActiveBudgets: 3,
    });
  });

  it("premium e custom não têm limite prático (Infinity)", () => {
    for (const plan of ["premium", "custom"] as const) {
      const limits = limitsFor(plan);
      expect(limits.maxHouseholdsOwned).toBe(Infinity);
      expect(limits.maxMembersPerHousehold).toBe(Infinity);
      expect(limits.maxActiveGoals).toBe(Infinity);
      expect(limits.maxActiveBudgets).toBe(Infinity);
    }
  });
});
