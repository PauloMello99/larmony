import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { CronJob, CronJobName } from "./cron-job";

export interface RegisteredCronJob {
  name: string;
  run: () => Promise<unknown>;
}

/**
 * Descobre todos os providers decorados com @CronJobName (em qualquer módulo)
 * e os expõe ao InternalCronController. Cacheado no boot — o conjunto de jobs
 * é estático em runtime.
 */
@Injectable()
export class CronJobsService implements OnModuleInit {
  private jobs: RegisteredCronJob[] = [];

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit(): void {
    this.jobs = this.discovery
      .getProviders({ metadataKey: CronJobName.KEY })
      .flatMap((wrapper) => {
        const instance = wrapper.instance as CronJob | undefined;
        if (!instance || typeof instance.run !== "function") return [];
        const name = this.discovery.getMetadataByDecorator(CronJobName, wrapper);
        return [{ name: name ?? wrapper.name, run: () => instance.run() }];
      });
  }

  getJobs(): RegisteredCronJob[] {
    return this.jobs;
  }
}
