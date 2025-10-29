import { SetMetadata } from '@nestjs/common';
import { RoleType, ROLES_KEY } from '@/enums/role.enum';

export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
