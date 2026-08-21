import { jest } from "@jest/globals";
import type { Queue } from "bullmq";
import { BackgroundJobsService } from "@/infrastructure/queue/background-jobs.service";
import { JOB_NAMES } from "@/infrastructure/queue/queue.constants";

describe("BackgroundJobsService", () => {
  it("uses a BullMQ-compatible deterministic entity job id", async () => {
    const add = jest.fn<Queue["add"]>().mockResolvedValue({} as never);
    const service = new BackgroundJobsService({ add } as unknown as Queue);

    await service.notification("0198b1c0-0000-7000-8000-000000000001", "request-1");

    expect(add).toHaveBeenCalledWith(
      JOB_NAMES.notificationDispatch,
      expect.objectContaining({ v: 1, entityId: "0198b1c0-0000-7000-8000-000000000001" }),
      expect.objectContaining({
        jobId: "notification.dispatch--0198b1c0-0000-7000-8000-000000000001",
      }),
    );
  });
});
