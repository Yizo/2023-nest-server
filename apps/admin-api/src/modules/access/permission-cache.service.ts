import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AdminApiConfig } from "@/config";
import type { MenuAccessNode } from "./access.types";
import { RedisService } from "@/infrastructure/redis/redis.service";

const PERMISSION_CACHE_PREFIX = "auth:permissions";
const MENU_CACHE_PREFIX = "auth:menus";

/** 缓存用户的操作权限和菜单，并按用户一起失效。 */
@Injectable()
export class PermissionCacheService {
	private readonly logger = new Logger(PermissionCacheService.name);
	private readonly expiresIn: number;

	constructor(
		private readonly redis: RedisService,
		configService: ConfigService,
	) {
		this.expiresIn = configService.getOrThrow<AdminApiConfig>("app").auth.permissionCacheExpiresIn;
	}

	async getPermissions(userId: number): Promise<string[] | null> {
		try {
			await this.redis.ensureConnected();
			const value = await this.redis.getClient().get(this.permissionKey(userId));
			return value === null ? null : this.parseStrings(value);
		} catch (error) {
			this.logger.warn(`读取用户操作权限缓存失败：${String(error)}`);
			return null;
		}
	}

	async setPermissions(userId: number, permissions: string[]): Promise<void> {
		try {
			await this.redis.ensureConnected();
			await this.redis.getClient().set(this.permissionKey(userId), JSON.stringify(permissions), {
				EX: this.expiresIn,
			});
		} catch (error) {
			this.logger.warn(`写入用户操作权限缓存失败：${String(error)}`);
		}
	}

	async getMenus(userId: number): Promise<MenuAccessNode[] | null> {
		try {
			await this.redis.ensureConnected();
			const value = await this.redis.getClient().get(this.menuKey(userId));
			if (value === null) return null;
			const parsed: unknown = JSON.parse(value);
			return Array.isArray(parsed) ? (parsed as MenuAccessNode[]) : null;
		} catch (error) {
			this.logger.warn(`读取用户菜单缓存失败：${String(error)}`);
			return null;
		}
	}

	async setMenus(userId: number, menus: MenuAccessNode[]): Promise<void> {
		try {
			await this.redis.ensureConnected();
			await this.redis.getClient().set(this.menuKey(userId), JSON.stringify(menus), {
				EX: this.expiresIn,
			});
		} catch (error) {
			this.logger.warn(`写入用户菜单缓存失败：${String(error)}`);
		}
	}

	async invalidateUser(userId: number): Promise<void> {
		await this.invalidateUsers([userId]);
	}

	async invalidateUsers(userIds: number[]): Promise<void> {
		const uniqueUserIds = [...new Set(userIds)];
		if (!uniqueUserIds.length) return;
		try {
			await this.redis.ensureConnected();
			const keys = uniqueUserIds.flatMap((userId) => [
				this.permissionKey(userId),
				this.menuKey(userId),
			]);
			await this.redis.getClient().del(keys);
		} catch (error) {
			this.logger.warn(`清理用户权限和菜单缓存失败：${String(error)}`);
		}
	}

	private parseStrings(value: string): string[] | null {
		try {
			const parsed: unknown = JSON.parse(value);
			return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
				? parsed
				: null;
		} catch {
			return null;
		}
	}

	private permissionKey(userId: number): string {
		return `${PERMISSION_CACHE_PREFIX}:${userId}`;
	}

	private menuKey(userId: number): string {
		return `${MENU_CACHE_PREFIX}:${userId}`;
	}
}
