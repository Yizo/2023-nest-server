import { Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { Notification, NotificationRecipient } from "@/database/entities";
import { BackgroundJobsService } from "@/infrastructure/queue/background-jobs.service";
import { RealtimePublisher } from "@/infrastructure/realtime/realtime-publisher.service";
import { decodeCursor, encodeCursor, type CursorResult } from "@/common/pagination/pagination";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly em: EntityManager,
    private readonly jobs: BackgroundJobsService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async createForUsers(input: {
    type: string; title: string; content: string; payload?: Record<string, unknown>; userIds: string[]; requestId?: string;
  }): Promise<void> {
    // 通知记录和收件人关系先写入 PostgreSQL，队列只负责后续实时投递。
    const recipientIds = await this.em.transactional(async (em) => {
      const notification = em.create(Notification, {
        type: input.type,
        title: input.title,
        content: input.content,
        payload: input.payload ?? {},
      });
      em.persist(notification);
      const ids: string[] = [];
      for (const userId of [...new Set(input.userIds)]) {
        const recipient = em.create(NotificationRecipient, { notificationId: notification.id, userId });
        em.persist(recipient);
        ids.push(recipient.id);
      }
      await em.flush();
      return ids;
    });
    await Promise.all(recipientIds.map((id) => this.jobs.notification(id, input.requestId)));
  }

  async listForUser(userId: string, cursor: string | undefined, pageSize: number): Promise<CursorResult<Record<string, unknown>>> {
    // 使用 createdAt + id 组成稳定的下一页标记（cursor），避免新通知插入后重复或漏项。
    const params: unknown[] = [userId];
    const conditions = ["nr.user_id = ?"];
    if (cursor) {
      try {
        const decoded = decodeCursor(cursor);
        params.push(decoded.createdAt, decoded.id);
        conditions.push("(nr.created_at, nr.id) < (?, ?)");
      } catch {
        throw new BadRequestException("分页标记无效");
      }
    }
    params.push(pageSize + 1);
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown> & { recipientId: string; createdAt: Date }>>(
      `select nr.id as "recipientId", n.id, n.type, n.title, n.content, n.payload,
              nr.read_at as "readAt", nr.created_at as "createdAt"
       from notification_recipients nr
       join notifications n on n.id = nr.notification_id
       where ${conditions.join(" and ")}
       order by nr.created_at desc, nr.id desc limit ?`,
      params,
    );
    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    const last = items.at(-1);
    return { items, hasMore, nextCursor: hasMore && last ? encodeCursor(new Date(last.createdAt), last.recipientId) : null };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.em.count(NotificationRecipient, { userId, readAt: null });
  }

  async markRead(userId: string, recipientId: string): Promise<void> {
    const recipient = await this.em.findOne(NotificationRecipient, { id: recipientId, userId });
    if (!recipient) throw new NotFoundException("通知不存在");
    if (!recipient.readAt) recipient.readAt = new Date();
    await this.em.flush();
  }

  async dispatch(recipientId: string): Promise<void> {
    // 先发布实时事件，成功后才把 deliveryStatus 标记为 sent；重复任务会安全返回。
    const recipient = await this.em.findOne(NotificationRecipient, { id: recipientId });
    if (!recipient || recipient.deliveryStatus === "sent") return;
    await this.realtime.publishToUser(recipient.userId, { notificationId: recipient.notificationId, recipientId: recipient.id });
    recipient.deliveryStatus = "sent";
    recipient.deliveredAt = new Date();
    await this.em.flush();
  }

  async pendingIds(limit = 500): Promise<string[]> {
    const recipients = await this.em.find(NotificationRecipient, { deliveryStatus: "pending" }, {
      orderBy: { createdAt: "asc" }, limit, fields: ["id"],
    });
    return recipients.map((recipient) => recipient.id);
  }
}
