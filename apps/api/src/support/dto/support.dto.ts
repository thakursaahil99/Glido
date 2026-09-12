import { IsString, Length } from "class-validator";

export class SendSupportMessageDto {
  @IsString()
  @Length(1, 2000)
  message: string;
}
