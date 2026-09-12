import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpsertAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  line1: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateUserStatusDto {
  @IsIn(["ACTIVE", "BLOCKED", "SUSPENDED"])
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED";
}

export class RedeemLoyaltyPointsDto {
  @IsInt()
  @Min(1)
  points: number;
}
