import { SetMetadata } from '@nestjs/common';
import type { AnyMongoAbility, InferSubjects } from '@casl/ability';
import { Action, CHECK_POLICIES_KEY } from '@/enums';

type PoliciesHandler = (ability: AnyMongoAbility) => boolean;

export type CaslTypeHandler = PoliciesHandler | PoliciesHandler[];

// GUARD -> routers meta -> @CheckPolicies @Can @Cannot

// @CheckPolicies -> handler -> ability -> boolean
export const checkPolicies = (...handler: PoliciesHandler[]) => {
  return SetMetadata(CHECK_POLICIES_KEY.HANDLER, handler);
};

// @Can -> Action, Subject, Conditions
export const can = (
  action: Action,
  subject: InferSubjects<any>,
  conditions?: any,
) => {
  return SetMetadata(CHECK_POLICIES_KEY.CAN, (ability: AnyMongoAbility) => {
    return ability.can(action, subject, conditions);
  });
};

// @Cannot -> Action, Subject, Conditions
export const cannot = (
  action: Action,
  subject: InferSubjects<any>,
  conditions?: any,
) => {
  return SetMetadata(CHECK_POLICIES_KEY.CANNOT, (ability: AnyMongoAbility) => {
    return ability.cannot(action, subject, conditions);
  });
};
