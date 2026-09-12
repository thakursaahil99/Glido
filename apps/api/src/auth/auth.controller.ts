import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import {
  AdminLoginDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RequestOtpDto,
  VerifyOtpDto,
} from "./dto/auth.dto";

// Tighter than the global 100/min default (see app.module.ts) — these are the endpoints
// a brute-force or OTP-spam attempt would actually hit.
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.name, dto.identifier, dto.password, dto.referralCode);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.identifier, dto.password);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("admin/login")
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  // --- OTP endpoints kept for future phone-verification use; the web app's
  // primary login/signup flow uses email/phone + password (see above). ---
  @Throttle(AUTH_THROTTLE)
  @Post("otp/request")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.identifier);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("otp/verify")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.identifier, dto.code, dto.name);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
