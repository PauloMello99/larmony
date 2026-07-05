import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { InternalCronController } from "./internal-cron.controller";
import { CronJobsService } from "./cron-jobs.service";

@Module({
  imports: [DiscoveryModule],
  controllers: [InternalCronController],
  providers: [CronJobsService],
})
export class InternalCronModule {}
