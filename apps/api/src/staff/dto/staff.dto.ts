import { ADMIN_ROLES, PERMISSIONS, type AdminRole, type Permission } from "@glido/shared";
import { IsArray, IsEmail, IsIn, IsOptional, IsString, Length } from "class-validator";

export class CreateStaffDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 100)
  password: string;

  @IsIn(ADMIN_ROLES)
  adminRole: AdminRole;

  @IsOptional()
  @IsArray()
  @IsIn(PERMISSIONS, { each: true })
  permissions?: Permission[];
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsIn(ADMIN_ROLES)
  adminRole?: AdminRole;

  @IsOptional()
  @IsArray()
  @IsIn(PERMISSIONS, { each: true })
  permissions?: Permission[];

  @IsOptional()
  @IsIn(["ACTIVE", "BLOCKED", "SUSPENDED"])
  status?: "ACTIVE" | "BLOCKED" | "SUSPENDED";

  @IsOptional()
  @IsString()
  @Length(6, 100)
  newPassword?: string;
}
