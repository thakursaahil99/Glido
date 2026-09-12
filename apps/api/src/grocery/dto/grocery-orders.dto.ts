import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class GroceryOrderItemInputDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateGroceryOrderDto {
  @IsString()
  addressId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GroceryOrderItemInputDto)
  items: GroceryOrderItemInputDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @IsOptional()
  @IsIn(["COD", "WALLET"])
  paymentMethod?: "COD" | "WALLET";
}

export class UpdateGroceryOrderStatusDto {
  @IsIn([
    "PENDING",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ])
  status:
    | "PENDING"
    | "ACCEPTED"
    | "PREPARING"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED";

  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelGroceryOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
