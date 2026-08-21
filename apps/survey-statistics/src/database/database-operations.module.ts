import { Module } from "@nestjs/common";
import { IntegrityAuditService } from "./integrity-audit.service";

// 只放数据库完整性巡检等运维能力，不承载普通业务 CRUD。
@Module({ providers: [IntegrityAuditService], exports: [IntegrityAuditService] })
export class DatabaseOperationsModule {}
