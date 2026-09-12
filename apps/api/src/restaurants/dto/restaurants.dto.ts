import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpsertRestaurantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cuisineTags?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avgDeliveryTimeMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPercent?: number;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}

export class CreateRestaurantOwnerDto {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  password: string;
}

/** What a restaurant owner may edit on their own listing — no status or commission control. */
export class UpdatePartnerRestaurantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cuisineTags?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avgDeliveryTimeMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}

export class UpdateRestaurantStatusDto {
  @IsIn(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"])
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
}

export class UpsertMenuCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class MenuItemAddonInputDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

export class UpsertMenuItemDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  addons?: MenuItemAddonInputDto[];
}
