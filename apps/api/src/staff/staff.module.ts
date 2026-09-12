import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
  imports: [AuditLogModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
