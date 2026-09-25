import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import {
  AdminLoginDto,
  GoogleLoginDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RequestOtpDto,
  RequestPasswordResetDto,
  RequestRegistrationOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
  VerifyRegistrationDto,
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
  @Post("register/request-otp")
  requestRegistrationOtp(@Body() dto: RequestRegistrationOtpDto) {
    return this.authService.requestRegistrationOtp(dto.name, dto.email, dto.phone, dto.password, dto.referralCode);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("register/verify")
  verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(dto.email, dto.code);
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

  @Throttle(AUTH_THROTTLE)
  @Post("google")
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken, dto.referralCode);
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

  @Throttle(AUTH_THROTTLE)
  @Post("password/reset-request")
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.identifier);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("password/reset")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.identifier, dto.code, dto.newPassword);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  logoutAll(@CurrentUser() user: AuthUser) {
    return this.authService.logoutAll(user.id);
  }
}
