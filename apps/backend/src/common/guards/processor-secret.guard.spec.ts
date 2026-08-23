import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ProcessorSecretGuard } from "./processor-secret.guard";

function buildContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe("ProcessorSecretGuard", () => {
  it("throws when the secret is missing from the request", () => {
    const config = { get: jest.fn().mockReturnValue("expected-secret") } as unknown as ConfigService;
    const guard = new ProcessorSecretGuard(config);

    expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
  });

  it("throws when the provided secret does not match", () => {
    const config = { get: jest.fn().mockReturnValue("expected-secret") } as unknown as ConfigService;
    const guard = new ProcessorSecretGuard(config);

    expect(() =>
      guard.canActivate(buildContext({ "x-processor-secret": "wrong-secret" })),
    ).toThrow(UnauthorizedException);
  });

  it("returns true when the provided secret matches", () => {
    const config = { get: jest.fn().mockReturnValue("expected-secret") } as unknown as ConfigService;
    const guard = new ProcessorSecretGuard(config);

    expect(
      guard.canActivate(buildContext({ "x-processor-secret": "expected-secret" })),
    ).toBe(true);
  });
});
