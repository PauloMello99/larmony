import { SetHouseholdSuspendedUseCase } from "./set-household-suspended.use-case";
import {
  HouseholdHasActiveSubscriptionException,
  PlatformTargetNotFoundException,
} from "../../domain/exceptions/platform-admin.exceptions";
import type { IAdminRepository } from "../../domain/admin.repository.interface";
import type { IPaymentGateway } from "../../../subscriptions/domain/ports/payment-gateway.port";
import type { AuditService } from "../../../audit/audit.service";

function make() {
  const calls: string[] = [];
  const adminRepo = {
    getHouseholdBillingState: jest.fn().mockResolvedValue(null),
    markSubscriptionCanceled: jest.fn().mockImplementation(async () => {
      calls.push("markCanceled");
    }),
    setHouseholdSuspended: jest.fn().mockImplementation(async () => {
      calls.push("suspend");
      return true;
    }),
  } as unknown as jest.Mocked<IAdminRepository>;
  const gateway = {
    cancelSubscription: jest.fn().mockImplementation(async () => {
      calls.push("cancelStripe");
    }),
  } as unknown as jest.Mocked<IPaymentGateway>;
  const audit = {
    logByAuthId: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;
  const uc = new SetHouseholdSuspendedUseCase(adminRepo, gateway, audit);
  return { uc, adminRepo, gateway, audit, calls };
}

describe("SetHouseholdSuspendedUseCase", () => {
  it("lar free (sem sub Stripe) suspende direto, sem tocar o gateway", async () => {
    const { uc, adminRepo, gateway, audit } = make();
    adminRepo.getHouseholdBillingState.mockResolvedValue({
      stripeSubscriptionId: null,
      type: "free",
      status: "active",
    });

    await uc.execute("hh_1", true, "auth_1");

    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
    expect(adminRepo.setHouseholdSuspended).toHaveBeenCalledWith("hh_1", true);
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({
        metadata: { operation: "suspend", canceledStripe: false },
      }),
    );
  });

  it("lar pago SEM o flag → 409 HOUSEHOLD_HAS_ACTIVE_SUBSCRIPTION, nada acontece", async () => {
    const { uc, adminRepo, gateway } = make();
    adminRepo.getHouseholdBillingState.mockResolvedValue({
      stripeSubscriptionId: "sub_x",
      type: "standard",
      status: "active",
    });

    await expect(uc.execute("hh_1", true, "auth_1")).rejects.toBeInstanceOf(
      HouseholdHasActiveSubscriptionException,
    );
    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
    expect(adminRepo.setHouseholdSuspended).not.toHaveBeenCalled();
  });

  it("lar pago COM o flag → cancela no Stripe (prorate) → espelha local → suspende, nesta ordem", async () => {
    const { uc, adminRepo, gateway, audit, calls } = make();
    adminRepo.getHouseholdBillingState.mockResolvedValue({
      stripeSubscriptionId: "sub_x",
      type: "standard",
      status: "past_due",
    });

    await uc.execute("hh_1", true, "auth_1", true);

    expect(gateway.cancelSubscription).toHaveBeenCalledWith("sub_x", {
      prorate: true,
      invoiceNow: true,
    });
    expect(adminRepo.markSubscriptionCanceled).toHaveBeenCalledWith("hh_1");
    expect(calls).toEqual(["cancelStripe", "markCanceled", "suspend"]);
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({
        metadata: { operation: "suspend", canceledStripe: true },
      }),
    );
  });

  it("sub Stripe já cancelada localmente (status canceled) suspende direto", async () => {
    const { uc, adminRepo, gateway } = make();
    adminRepo.getHouseholdBillingState.mockResolvedValue({
      stripeSubscriptionId: "sub_x",
      type: "free",
      status: "canceled",
    });

    await uc.execute("hh_1", true, "auth_1");

    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
    expect(adminRepo.setHouseholdSuspended).toHaveBeenCalledWith("hh_1", true);
  });

  it("REATIVAR nunca é bloqueado nem consulta billing", async () => {
    const { uc, adminRepo, gateway } = make();

    await uc.execute("hh_1", false, "auth_1");

    expect(adminRepo.getHouseholdBillingState).not.toHaveBeenCalled();
    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
    expect(adminRepo.setHouseholdSuspended).toHaveBeenCalledWith("hh_1", false);
  });

  it("lar inexistente → 404 PLATFORM_TARGET_NOT_FOUND", async () => {
    const { uc, adminRepo } = make();
    adminRepo.getHouseholdBillingState.mockResolvedValue(null);
    adminRepo.setHouseholdSuspended.mockResolvedValue(false);

    await expect(uc.execute("hh_missing", true, "auth_1")).rejects.toBeInstanceOf(
      PlatformTargetNotFoundException,
    );
  });
});
