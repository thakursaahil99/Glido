import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertRideTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  baseFare: number;

  @IsNumber()
  @Min(0)
  perKmFare: number;

  @IsNumber()
  @Min(0)
  perMinuteFare: number;

  @IsNumber()
  @Min(0)
  minFare: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cancellationFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
