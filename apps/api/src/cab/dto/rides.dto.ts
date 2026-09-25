import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class EstimateRideDto {
  @IsString()
  rideTypeId: string;

  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;

  @IsNumber()
  dropLat: number;

  @IsNumber()
  dropLng: number;
}

export class CreateRideDto {
  @IsString()
  rideTypeId: string;

  @IsString()
  pickupAddress: string;

  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;

  @IsString()
  dropAddress: string;

  @IsNumber()
  dropLat: number;

  @IsNumber()
  dropLng: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsIn(["COD", "WALLET"])
  paymentMethod?: "COD" | "WALLET";
}

export class UpdateRideStatusDto {
  @IsIn(["DRIVER_ARRIVED", "ONGOING", "COMPLETED", "CANCELLED"])
  status: "DRIVER_ARRIVED" | "ONGOING" | "COMPLETED" | "CANCELLED";

  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelRideDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRideReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class TipRideDto {
  @IsNumber()
  @Min(1)
  amount: number;
}
