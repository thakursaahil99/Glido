import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaThrottlerStorage } from "./throttler-storage.service";

@Module({
  imports: [PrismaModule],
  providers: [PrismaThrottlerStorage],
  exports: [PrismaThrottlerStorage],
})
export class ThrottlerStorageModule {}
