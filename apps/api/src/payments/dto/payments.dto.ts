import { IsString } from "class-validator";

export class VerifyPaymentDto {
  @IsString()
  orderId: string; // Glido order id

  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;
}
