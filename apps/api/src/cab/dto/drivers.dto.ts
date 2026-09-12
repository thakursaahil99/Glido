import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDriverDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsString()
  vehicleNumber: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsString()
  rideTypeId: string;

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

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  rideTypeId?: string;

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
