import { EventEmitter } from "node:events";
import { jest } from "@jest/globals";
import type { RedisClientType } from "redis";
import { RedisService } from "../../src/infrastructure/redis";

class FakeRedis extends EventEmitter {
	isOpen = false;
	isReady = false;
	connect = jest.fn(async () => {
		this.isOpen = true;
		this.isReady = true;
		this.emit("ready");
	});
	ping = jest.fn(async () => "PONG");
	close = jest.fn(async () => {
		this.isOpen = false;
		this.isReady = false;
	});
	destroy = jest.fn(() => {
		this.isOpen = false;
		this.isReady = false;
	});
}

describe("RedisService", () => {
	it("connects once, verifies PING, and closes gracefully", async () => {
		const client = new FakeRedis();
		const service = new RedisService(client as unknown as RedisClientType);

		await Promise.all([service.assertRuntimeReady(), service.assertRuntimeReady()]);
		expect(client.connect).toHaveBeenCalledTimes(1);
		expect(client.ping).toHaveBeenCalledTimes(2);

		await service.onModuleDestroy();
		expect(client.close).toHaveBeenCalledTimes(1);
		expect(client.destroy).not.toHaveBeenCalled();
	});

	it("fails readiness quickly while the client is reconnecting", async () => {
		const client = new FakeRedis();
		client.isOpen = true;
		const service = new RedisService(client as unknown as RedisClientType);

		await expect(service.assertRuntimeReady()).rejects.toThrow("Redis 尚未就绪");
		expect(await service.ping()).toBe(false);
	});

	it("disconnects directly when shutdown starts before ready", async () => {
		const client = new FakeRedis();
		client.isOpen = true;
		const service = new RedisService(client as unknown as RedisClientType);

		await service.onModuleDestroy();
		expect(client.destroy).toHaveBeenCalledTimes(1);
		expect(client.close).not.toHaveBeenCalled();
	});
});
