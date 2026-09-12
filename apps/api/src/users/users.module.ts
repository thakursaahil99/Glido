import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { WalletModule } from "../wallet/wallet.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuditLogModule, WalletModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
