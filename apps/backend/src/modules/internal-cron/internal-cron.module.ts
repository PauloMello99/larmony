import { Module } from "@nestjs/common";
import { InternalCronController } from "./internal-cron.controller";

@Module({
  controllers: [InternalCronController],
})
export class InternalCronModule {}
