import { defineAbility } from '@casl/ability';

const ability = defineAbility((can, cannot) => {
  can('read', 'Post');
  cannot('delete', 'Post');
});
