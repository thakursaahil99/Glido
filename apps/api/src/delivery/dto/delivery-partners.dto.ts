import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDeliveryPartnerDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;
}

export class CreateDeliveryPartnerAccountDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}

/** What a delivery partner may update on their own profile via /delivery-partner/me. */
export class UpdatePartnerProfileDto {
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;
}

export class UpdateDeliveryPartnerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsIn(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"])
  status?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;
}
