import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CaslAbilityService {
  forRoot() {
    const { can, build } = new AbilityBuilder(createMongoAbility);

    can('manage', 'all');

    const ability = build({
      detectSubjectType: (object) => object.constructor.name,
    });

    return ability;
  }
}
