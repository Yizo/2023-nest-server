import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { RequestContext } from "@mikro-orm/core";
import { MikroORM } from "@mikro-orm/postgresql";
import * as argon2 from "argon2";
import request from "supertest";
import { AppModule } from "@/app.module";
import { User } from "@/database/entities";
import { RedisService } from "@/infrastructure/redis/redis.service";
import { AuthorizationService } from "@/modules/identity/authorization.service";
import { createValidationPipe } from "@/common/pipes/validation.pipe";

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

describe("survey-statistics greenfield flow", () => {
  let app: INestApplication;
  let orm: MikroORM;

  beforeAll(async () => {
    assertIsolatedInfrastructure();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(createValidationPipe());

    orm = app.get(MikroORM);
    await orm.em.getConnection().execute("drop schema public cascade; create schema public");
    await orm.migrator.up();

    const redis = app.get(RedisService);
    await redis.ensureConnected();
    await redis.client.flushdb();

    const em = orm.em.fork();
    const owner = em.create(User, {
      username: "owner_e2e",
      email: "owner.e2e@example.com",
      displayName: "E2E Platform Owner",
      passwordHash: await argon2.hash("Owner-password-2026!", { type: argon2.argon2id }),
      isPlatformOwner: true,
    });
    em.persist(owner);
    await em.flush();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("supports migration readiness, dynamic RBAC, surveys, statistics and queued notification delivery", async () => {
    const api = request(app.getHttpServer());

    const ready = await api.get("/api/v1/health/ready").expect(200);
    expect((ready.body as Envelope<{ status: string }>).data.status).toBe("ready");

    const missingToken = await api.get("/api/v1/identity/me").expect(401);
    expect(missingToken.body).toEqual(expect.objectContaining({
      code: 1001,
      message: "请先登录",
    }));
    const invalidToken = await api.get("/api/v1/identity/me")
      .set("Authorization", "Bearer invalid-token").expect(401);
    expect(invalidToken.body).toEqual(expect.objectContaining({
      code: 1003,
      message: "登录凭证无效",
    }));

    const invalid = await api.post("/api/v1/auth/login").send({
      username: 123,
      password: "",
      unexpected: true,
    }).expect(400);
    expect(invalid.body).toEqual(expect.objectContaining({
      code: 400,
      message: expect.any(String),
      data: null,
    }));
    expect(invalid.body.message).not.toMatch(/property|must be|should not exist/i);

    const ownerLogin = await api.post("/api/v1/auth/login").send({
      username: "owner_e2e",
      password: "Owner-password-2026!",
    }).expect(201);
    const ownerLoginData = (ownerLogin.body as Envelope<{
      accessToken: string;
      user: { id: string; username: string; email: string; displayName: string; isPlatformOwner: boolean };
    }>).data;
    const ownerToken = ownerLoginData.accessToken;
    expect(ownerLoginData.user).toEqual(expect.objectContaining({
      username: "owner_e2e",
      email: "owner.e2e@example.com",
      isPlatformOwner: true,
    }));

    const permissionsResponse = await api.get("/api/v1/identity/permissions")
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const permissions = (permissionsResponse.body as Envelope<Array<{ id: string; code: string }>>).data;
    const permissionIds = new Map(permissions.map((permission) => [permission.code, permission.id]));
    expect(permissions).toHaveLength(25);

    const roleResponse = await api.post("/api/v1/identity/roles")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ code: "respondent", name: "问卷填写者" })
      .expect(201);
    const roleId = (roleResponse.body as Envelope<{ id: string }>).data.id;
    const roleListResponse = await api.get("/api/v1/identity/roles?page=1&pageSize=10&name=问卷")
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((roleListResponse.body as Envelope<{ items: unknown[]; total: number }>).data)
      .toEqual(expect.objectContaining({ total: 1, items: expect.any(Array) }));
    const respondentPermissionIds = ["survey.read", "survey.respond", "notification.read"]
      .map((code) => permissionIds.get(code));
    expect(respondentPermissionIds.every(Boolean)).toBe(true);

    await api.post(`/api/v1/identity/roles/${roleId}/permissions`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ permissionIds: respondentPermissionIds })
      .expect(201);

    const userResponse = await api.post("/api/v1/identity/users")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        username: "respondent_e2e",
        email: "respondent.e2e@example.com",
        displayName: "E2E Respondent",
        password: "Respondent-password-2026!",
        roleIds: [roleId],
      })
      .expect(201);
    const userId = (userResponse.body as Envelope<{ id: string }>).data.id;

    const userList = await api.get("/api/v1/identity/users?search=respondent.e2e&page=1&pageSize=10")
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((userList.body as Envelope<{ total: number }>).data.total).toBe(1);

    const authorization = app.get(AuthorizationService);
    await RequestContext.create(orm.em, async () => {
      await expect(authorization.hasAllPermissions(userId, ["survey.read", "survey.respond"])).resolves.toBe(true);
      await expect(authorization.hasAllPermissions(userId, ["survey.respond", "survey.publish"])).resolves.toBe(false);
    });

    const surveyResponse = await api.post("/api/v1/surveys")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Greenfield E2E Survey",
        description: "End-to-end production path",
        questions: [
          { type: "single", title: "Choose one", required: true, options: [{ label: "A" }, { label: "B" }] },
          { type: "text", title: "Comment", required: false, options: [] },
        ],
      })
      .expect(201);
    const surveyId = (surveyResponse.body as Envelope<{ id: string }>).data.id;

    const detailResponse = await api.get(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const detail = (detailResponse.body as Envelope<{
      questions: Array<{ id: string; type: string; options: Array<{ id: string }> }>;
    }>).data;
    const singleQuestion = detail.questions.find((question) => question.type === "single");
    const textQuestion = detail.questions.find((question) => question.type === "text");
    expect(singleQuestion?.options).toHaveLength(2);

    await api.post(`/api/v1/surveys/${surveyId}/publish`)
      .set("Authorization", `Bearer ${ownerToken}`).expect(201);
    await api.post(`/api/v1/surveys/${surveyId}/update`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Cannot change",
        questions: [{ type: "text", title: "Still valid input", required: true, options: [] }],
      })
      .expect(409);

    const respondentLogin = await api.post("/api/v1/auth/login").send({
      username: "respondent_e2e",
      password: "Respondent-password-2026!",
    }).expect(201);
    const respondentLoginData = (respondentLogin.body as Envelope<{
      accessToken: string;
      user: { username: string; email: string };
    }>).data;
    const respondentToken = respondentLoginData.accessToken;
    expect(respondentLoginData.user).toEqual(expect.objectContaining({
      username: "respondent_e2e",
      email: "respondent.e2e@example.com",
    }));
    const surveyList = await api.get("/api/v1/surveys?status=published&page=1&pageSize=10")
      .set("Authorization", `Bearer ${respondentToken}`).expect(200);
    expect((surveyList.body as Envelope<{ total: number }>).data.total).toBe(1);
    const answers = [
      { questionId: singleQuestion?.id, optionIds: [singleQuestion?.options[0]?.id] },
      { questionId: textQuestion?.id, optionIds: [], textValue: "works" },
    ];

    await api.post(`/api/v1/surveys/${surveyId}/responses`)
      .set("Authorization", `Bearer ${respondentToken}`).send({ answers }).expect(201);
    await api.post(`/api/v1/surveys/${surveyId}/responses`)
      .set("Authorization", `Bearer ${respondentToken}`).send({ answers }).expect(409);

    const statistics = await api.get(`/api/v1/surveys/${surveyId}/statistics`)
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((statistics.body as Envelope<{ responseCount: number }>).data.responseCount).toBe(1);

    await waitFor(async () => {
      const rows = await orm.em.getConnection().execute<Array<{ delivery_status: string }>>(
        "select delivery_status from notification_recipients where user_id = ?",
        [(await orm.em.getConnection().execute<Array<{ id: string }>>(
          "select id from users where email = ?", ["owner.e2e@example.com"],
        ))[0]?.id],
      );
      return rows[0]?.delivery_status === "sent";
    });

    const notifications = await api.get("/api/v1/notifications")
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const notificationItems = (notifications.body as Envelope<{ items: Array<{ recipientId: string }> }>).data.items;
    expect(notificationItems).toHaveLength(1);
    await api.post(`/api/v1/notifications/${notificationItems[0]?.recipientId}/read`)
      .set("Authorization", `Bearer ${ownerToken}`).expect(201);
    const unread = await api.get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((unread.body as Envelope<{ count: number }>).data.count).toBe(0);

    const dictionaryTypeResponse = await api.post("/api/v1/system/dictionary-types")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ code: "survey_status", name: "问卷状态" })
      .expect(201);
    const dictionaryTypeId = (dictionaryTypeResponse.body as Envelope<{ id: string }>).data.id;
    const dictionaryTypeList = await api.get("/api/v1/system/dictionary-types?page=1&pageSize=10&name=问卷")
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((dictionaryTypeList.body as Envelope<{ items: unknown[]; total: number }>).data.total).toBe(1);
    await api.post("/api/v1/system/dictionary-items")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ dictTypeId: dictionaryTypeId, label: "草稿", value: "draft", sortOrder: 0 })
      .expect(201);
    const dictionaryItemList = await api.get(
      `/api/v1/system/dictionary-items?dictTypeId=${dictionaryTypeId}&page=1&pageSize=10`,
    ).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((dictionaryItemList.body as Envelope<{ items: unknown[]; total: number }>).data.total).toBe(1);

    const monitorAppResponse = await api.post("/api/v1/monitoring/apps")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ code: "frontend-e2e", name: "Frontend E2E" })
      .expect(201);
    const monitorApp = (monitorAppResponse.body as Envelope<{ id: string; ingestKey: string }>).data;
    const monitorAppList = await api.get("/api/v1/monitoring/apps?page=1&pageSize=10&code=frontend")
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((monitorAppList.body as Envelope<{ items: unknown[]; total: number }>).data.total).toBe(1);
    const errorEvent = {
      appCode: "frontend-e2e",
      ingestKey: monitorApp.ingestKey,
      eventId: "event-e2e-1",
      message: "TypeError: example",
      stack: "at example.ts:1:1",
      occurredAt: new Date().toISOString(),
      context: { page: "/survey", authorization: "must-be-removed" },
    };
    const firstReport = await api.post("/api/v1/monitoring/client-errors").send(errorEvent).expect(202);
    expect((firstReport.body as Envelope<{ duplicate: boolean }>).data.duplicate).toBe(false);
    const duplicateReport = await api.post("/api/v1/monitoring/client-errors").send(errorEvent).expect(202);
    expect((duplicateReport.body as Envelope<{ duplicate: boolean }>).data.duplicate).toBe(true);

    const sdkEvent = {
      type: "request-error",
      appId: "frontend-e2e",
      ingestKey: monitorApp.ingestKey,
      message: "Request failed: GET /api/example",
      timestamp: Date.now(),
      url: "http://localhost/example",
      release: "1.0.0",
      context: { page: "/admin/monitor" },
      extra: { requestHeaders: { authorization: "must-be-removed" }, status: 500 },
    };
    const sdkReport = await api.post("/api/v1/error-report").send([sdkEvent]).expect(202);
    expect((sdkReport.body as Envelope<{ accepted: number; duplicates: number }>).data)
      .toEqual({ accepted: 1, duplicates: 0 });
    const duplicateSdkReport = await api.post("/api/v1/error-report").send([sdkEvent]).expect(202);
    expect((duplicateSdkReport.body as Envelope<{ accepted: number; duplicates: number }>).data)
      .toEqual({ accepted: 1, duplicates: 1 });

    await waitFor(async () => {
      const rows = await orm.em.getConnection().execute<Array<{ total: number; pending: number }>>(
        `select count(*)::int as total,
                count(*) filter (where processed_at is null)::int as pending
         from client_errors where app_id = ?`,
        [monitorApp.id],
      );
      return rows[0]?.total === 2 && rows[0]?.pending === 0;
    });
    const errors = await api.get(`/api/v1/monitoring/client-errors?appId=${monitorApp.id}&pageSize=10`)
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const errorItems = (errors.body as Envelope<{
      items: Array<{ message: string; context: Record<string, unknown> }>;
    }>).data.items;
    expect(errorItems).toHaveLength(2);
    expect(errorItems.find((item) => item.message === "TypeError: example")?.context)
      .toEqual({ page: "/survey" });
    const sdkContext = errorItems.find((item) => item.message.startsWith("Request failed"))?.context;
    expect(sdkContext).toEqual(expect.objectContaining({ page: "/admin/monitor", eventType: "request-error" }));
    expect(JSON.stringify(sdkContext)).not.toMatch(/authorization|must-be-removed/i);
    const groups = await api.get(`/api/v1/monitoring/error-groups/${monitorApp.id}`)
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect((groups.body as Envelope<Array<{ count: number }>>).data).toHaveLength(2);
    expect((groups.body as Envelope<Array<{ count: number }>>).data.every((group) => group.count === 1)).toBe(true);
  });
});

function assertIsolatedInfrastructure(): void {
  const databaseName = new URL(process.env.DATABASE_URL as string).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`E2E refuses to reset non-test database: ${databaseName}`);
  }
  const redisDatabase = Number(new URL(process.env.REDIS_URL as string).pathname.slice(1) || "0");
  if (!Number.isInteger(redisDatabase) || redisDatabase < 1) {
    throw new Error("E2E requires an isolated Redis database number greater than zero");
  }
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for background job");
}
