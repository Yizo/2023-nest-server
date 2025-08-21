import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityService } from './casl-ability.service';
import { CHECK_POLICIES_KEY } from '@/enums';
import type { CaslTypeHandler } from '@/decorators/casl.decorator';

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityService: CaslAbilityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = this.reflector.getAllAndMerge<CaslTypeHandler[]>(
      CHECK_POLICIES_KEY.HANDLER,
      [context.getHandler(), context.getClass()],
    ) as CaslTypeHandler;

    const can = this.reflector.getAllAndMerge<any[]>(CHECK_POLICIES_KEY.CAN, [
      context.getHandler(),
      context.getClass(),
    ]) as CaslTypeHandler;

    const cannot = this.reflector.getAllAndMerge<any[]>(
      CHECK_POLICIES_KEY.CANNOT,
      [context.getHandler(), context.getClass()],
    ) as CaslTypeHandler;

    if (!handler || !can || !cannot) {
      return true;
    }

    const ability = this.caslAbilityService.forRoot();

    let result = true;

    if (handler) {
      if (Array.isArray(handler)) {
        result = handler.every((handler) => handler(ability));
      } else {
        result = handler(ability);
      }
    }

    if (result && can) {
      if (Array.isArray(can)) {
        result = can.every((can) => can(ability));
      } else {
        result = can(ability);
      }
    }

    if (result && cannot) {
      if (Array.isArray(cannot)) {
        result = cannot.every((cannot) => cannot(ability));
      } else {
        result = cannot(ability);
      }
    }

    return result;
  }
}
