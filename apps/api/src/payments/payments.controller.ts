import { Body, Controller, ForbiddenException, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { VerifyPaymentDto } from "./dto/payments.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post("verify")
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifySignature(user.id, dto);
  }

  /** Demo-only: completes payment without Razorpay when no test keys are configured. */
  @Post("mock/:orderId")
  mockPay(@CurrentUser() user: AuthUser, @Param("orderId") orderId: string) {
    if (this.paymentsService.isConfigured) {
      throw new ForbiddenException("Mock payments are disabled — Razorpay is configured.");
    }
    return this.paymentsService.mockPay(user.id, orderId);
  }
}
