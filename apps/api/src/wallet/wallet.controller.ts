import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { TopUpWalletDto } from "./dto/wallet.dto";
import { WalletService } from "./wallet.service";

@ApiTags("wallet")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("wallet/me")
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.wallet.getSummary(user.id);
  }

  @Get("transactions")
  transactions(@CurrentUser() user: AuthUser, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.wallet.listTransactions(user.id, Number(page), Number(pageSize));
  }

  @Post("topup")
  topUp(@CurrentUser() user: AuthUser, @Body() dto: TopUpWalletDto) {
    return this.wallet.topUp(user.id, dto.amount);
  }
}
