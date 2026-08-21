import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@/common/decorators";
import type { AuthenticatedUser } from "@/common/types/auth.types";
import { CursorQueryDto } from "@/common/pagination/pagination";
import { NotificationsService } from "./notifications.service";

/** 通知读取和已读操作是同步接口，实时推送由 RealtimePublisher 异步完成。 */
@ApiTags("通知")
@ApiBearerAuth("bearer")
@Controller("notifications")
@RequirePermissions("notification.read")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "通知列表", description: "游标分页，返回当前用户的通知。" })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: CursorQueryDto) {
    return this.service.listForUser(user.id, query.cursor, query.pageSize);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "未读通知数量" })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.service.unreadCount(user.id) };
  }

  @Post(":recipientId/read")
  @ApiParam({ name: "recipientId", description: "通知接收记录 ID（UUIDv7）" })
  @ApiOperation({ summary: "标记通知已读" })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("recipientId") recipientId: string) {
    return this.service.markRead(user.id, recipientId);
  }
}
