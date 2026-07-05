import { Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";

interface JobResult {
  name: string;
  status: "ok" | "error";
  durationMs: number;
  error?: string;
}

@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class InternalCronController {
  @Post("tick")
  @HttpCode(200)
  async tick(): Promise<{ ok: boolean; jobs: JobResult[] }> {
    // Jobs de domínio são registrados aqui conforme as features do Larmony
    // ganham cron (ex.: lembretes de contas a pagar — bills).
    const jobs: Array<{ name: string; run: () => Promise<unknown> }> = [];

    const jobResults = await Promise.all(
      jobs.map(async (job): Promise<JobResult> => {
        const t0 = Date.now();
        try {
          await job.run();
          return { name: job.name, status: "ok", durationMs: Date.now() - t0 };
        } catch (err) {
          return {
            name: job.name,
            status: "error",
            durationMs: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );

    return { ok: true, jobs: jobResults };
  }
}
