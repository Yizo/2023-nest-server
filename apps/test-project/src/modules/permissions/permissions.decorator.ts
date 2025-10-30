import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '@/enums';

export interface RequiredPermission {
  action: PermissionAction;
  subject: string;
}

export const Permissions = (...permissions: RequiredPermission[]) =>
  SetMetadata('permissions', permissions);
