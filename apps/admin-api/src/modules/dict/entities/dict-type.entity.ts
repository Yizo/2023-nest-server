import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

@Entity()
export class DictType {
	@PrimaryKey()
	id!: number;

	@Property()
	dict_name!: string;

	@Property()
	dict_value!: string;
}
