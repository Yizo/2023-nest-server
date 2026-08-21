import { Module } from "@nestjs/common";
import { SystemModule } from "@/modules/system/system.module";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringMaintenanceService } from "./monitoring-maintenance.service";
import { MonitoringQueries } from "./monitoring.queries";
import { MonitoringService } from "./monitoring.service";
import { SdkErrorReportController } from "./sdk-error-report.controller";
import { SdkErrorReportPipe } from "./sdk-error-report.pipe";

@Module({
  imports: [SystemModule],
  controllers: [MonitoringController, SdkErrorReportController],
  providers: [MonitoringService, MonitoringQueries, MonitoringMaintenanceService, SdkErrorReportPipe],
  exports: [MonitoringService, MonitoringMaintenanceService],
})
export class MonitoringModule {}
