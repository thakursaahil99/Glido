import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { SendSupportMessageDto } from "./dto/support.dto";
import { SupportService } from "./support.service";

@ApiTags("support")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller()
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Get("support/messages")
  myMessages(@CurrentUser() user: AuthUser) {
    return this.supportService.myMessages(user.id);
  }

  @Post("support/messages")
  send(@CurrentUser() user: AuthUser, @Body() dto: SendSupportMessageDto) {
    return this.supportService.sendAsCustomer(user.id, dto.message);
  }

  // --- Admin ---
  @Get("admin/support/conversations")
  @Roles("ADMIN")
  @RequirePermissions("manage_support")
  adminListConversations() {
    return this.supportService.adminListConversations();
  }

  @Get("admin/support/:userId/messages")
  @Roles("ADMIN")
  @RequirePermissions("manage_support")
  adminConversation(@Param("userId") userId: string) {
    return this.supportService.adminConversation(userId);
  }

  @Post("admin/support/:userId/messages")
  @Roles("ADMIN")
  @RequirePermissions("manage_support")
  adminReply(@Param("userId") userId: string, @Body() dto: SendSupportMessageDto) {
    return this.supportService.sendAsAdmin(userId, dto.message);
  }
}
