import { SetMetadata } from '@nestjs/common';
import { PolicyAction } from '@/enums';

export interface RequiredPermission {
  action: PolicyAction;
  subject: string;
}

export const Permissions = (...permissions: RequiredPermission[]) =>
  SetMetadata('permissions', permissions);
