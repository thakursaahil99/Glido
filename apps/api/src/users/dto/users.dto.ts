import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

// Accepts an optional leading "+" then 7-15 digits (E.164-ish) — loose enough for
// international numbers without a full carrier-aware validator, but rejects the
// obviously-unusable inputs ("abc", a single digit) a phone-required gate exists to catch.
// The empty-string branch keeps "clear this field" requests (sent as "") working.
const PHONE_REGEX = /^$|^\+?[0-9]{7,15}$/;

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: "Enter a valid phone number (digits only, optionally starting with +)." })
  phone?: string;
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
  @Matches(/^$|^[0-9]{6}$/, { message: "Enter a valid 6-digit pincode." })
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
