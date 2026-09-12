import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { NotificationsModule } from "../notifications/notifications.module";
import { WalletModule } from "../wallet/wallet.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpSenderService } from "./otp-sender.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [PassportModule, JwtModule.register({}), WalletModule, NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService, OtpSenderService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
