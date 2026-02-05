import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from './casl-ability.factory';
import {
  PolicyAction,
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  Subjects,
} from '@/enums';

export interface RequiredPermission {
  action: PolicyAction;
  subject: string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 白名单接口直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. 获取用户
    const { user } = context.switchToHttp().getRequest();
    // 2.1 如果用户不存在, 拒绝访问
    if (!user) {
      return false;
    }

    // 3. 创建权限能力
    const ability = await this.caslAbilityFactory.createForUser(user);

    // 4. 获取或推断所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // 5. 检查权限
    return requiredPermissions.every((permission) =>
      ability.can(permission.action, permission.subject as Subjects),
    );
  }
}
