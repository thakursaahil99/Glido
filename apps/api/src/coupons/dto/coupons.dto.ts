import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertCouponDto {
  @IsString()
  code: string;

  @IsIn(["PERCENT", "FLAT"])
  type: "PERCENT" | "FLAT";

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsInt()
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  perUserLimit?: number;

  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  validTo?: string;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  restaurantId?: string; // omit when validating for a grocery order

  @IsNumber()
  @Min(0)
  subtotal: number;
}
