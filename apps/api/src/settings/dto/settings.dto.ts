import { IsNumber, IsOptional, Min } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRatePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  groceryDeliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  groceryFreeDeliveryThreshold?: number;
}
