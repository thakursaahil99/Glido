import { IsEmail, IsOptional, IsString, Length } from "class-validator";

export class RequestOtpDto {
  @IsString()
  @Length(3, 100)
  identifier: string; // email or phone
}

export class VerifyOtpDto {
  @IsString()
  identifier: string;

  @IsString()
  @Length(4, 8)
  code: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 100)
  password: string;
}

export class RegisterDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(3, 100)
  identifier: string; // email or phone

  @IsString()
  @Length(6, 100)
  password: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  referralCode?: string;
}

export class LoginDto {
  @IsString()
  @Length(3, 100)
  identifier: string; // email or phone

  @IsString()
  @Length(6, 100)
  password: string;
}

export class GoogleLoginDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  referralCode?: string;
}
