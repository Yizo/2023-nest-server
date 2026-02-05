import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  ExtractSubjectType,
  PureAbility,
  createMongoAbility,
} from '@casl/ability';
import { MongoAbility } from '@casl/ability';
import { PolicyAction, Subjects, RoleType, PermissionType } from '@/enums';
import { User } from '@/modules/user/entities/user.entity';

// 定义能力类型
export type AppAbility = MongoAbility<[PolicyAction, Subjects]>;
export const AppAbility = PureAbility;

@Injectable()
export class CaslAbilityFactory {
  // 为用户创建能力
  async createForUser(user: User): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // 超级管理员拥有所有权限
    if (user.roles.some((role) => role.code === RoleType.SuperAdmin)) {
      can(PolicyAction.Manage, 'all');
    } else {
      // 普通用户和管理员根据角色权限设置
      for (const role of user.roles) {
        for (const permission of role.permissions) {
          // 根据权限类型和API路径设置能力
          switch (permission.type) {
            case PermissionType.Menu: // 菜单权限
              can(PolicyAction.Read, 'all');
              break;
            case PermissionType.Button: // 按钮权限
              can(
                [PolicyAction.Create, PolicyAction.Read, PolicyAction.Update],
                'all',
              );
              break;
            case PermissionType.API: // API权限
              // 根据API路径和方法设置具体权限
              if (permission.apiPath) {
                switch (permission.method?.toUpperCase()) {
                  case 'GET':
                    can(PolicyAction.Read, 'all');
                    break;
                  case 'POST':
                    can(PolicyAction.Create, 'all');
                    break;
                  case 'PUT':
                  case 'PATCH':
                    can(PolicyAction.Update, 'all');
                    break;
                  case 'DELETE':
                    can(PolicyAction.Delete, 'all');
                    break;
                  default:
                    can(PolicyAction.Read, 'all');
                }
              }
              break;
            case PermissionType.Data: // 数据权限
              can([PolicyAction.Read, PolicyAction.Update], 'all');
              break;
          }
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        (item as any).constructor as ExtractSubjectType<Subjects>,
    });
  }
}
