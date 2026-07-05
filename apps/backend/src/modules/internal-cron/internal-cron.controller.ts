import { Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { CronJobsService } from "./cron-jobs.service";

interface JobResult {
  name: string;
  status: "ok" | "error";
  durationMs: number;
  error?: string;
}

@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class InternalCronController {
  constructor(private readonly cronJobs: CronJobsService) {}

  @Post("tick")
  @HttpCode(200)
  async tick(): Promise<{ ok: boolean; jobs: JobResult[] }> {
    // Jobs de domínio se registram com @CronJobName no próprio módulo da
    // feature (ver cron-job.ts) — este controller não muda por feature.
    const jobs = this.cronJobs.getJobs();

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
