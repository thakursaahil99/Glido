import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class OrderItemInputDto {
  @IsString()
  menuItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  addonNames?: string[];
}

export class CreateOrderDto {
  @IsString()
  restaurantId: string;

  @IsString()
  addressId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @IsIn(["COD", "ONLINE", "WALLET"])
  paymentMethod: "COD" | "ONLINE" | "WALLET";

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;
}

export class UpdateOrderStatusDto {
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

export class AssignDeliveryPartnerDto {
  @IsString()
  deliveryPartnerId: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
