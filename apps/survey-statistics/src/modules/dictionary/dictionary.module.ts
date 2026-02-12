import { Module } from "@nestjs/common";
import { DictionaryService } from "./dictionary.service";
import { DictionaryController } from "./dictionary.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DictType } from "./entities/dictType.entity";
import { DictData } from "./entities/dictData.entity";

@Module({
	controllers: [DictionaryController],
	providers: [DictionaryService],
	imports: [TypeOrmModule.forFeature([DictType, DictData])],
	exports: [DictionaryService],
})
export class DictionaryModule {}
