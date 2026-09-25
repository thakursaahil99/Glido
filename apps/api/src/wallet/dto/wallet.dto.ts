import { IsNumber, Max, Min } from "class-validator";

export class TopUpWalletDto {
  // Demo-mode top-up has no real payment behind it (see WalletService.topUp) — capped
  // so it can't be used to mint unlimited balance, while still being useful for a demo.
  @IsNumber()
  @Min(1)
  @Max(2000)
  amount: number;
}
