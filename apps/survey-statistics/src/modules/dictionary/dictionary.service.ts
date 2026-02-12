import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DictType } from './entities/dictType.entity'
import { DictData } from './entities/dictData.entity'
import { QueryBuilderFactory, QueryBuilderHelper, QueryCondition } from '@base/commons'
import { CreateDictTypeDto, UpdateDictTypeDto, GetDictTypeDto } from './dto/dictType'
import { CreateDictDataDto, UpdateDictDataDto, GetDictDataDto, DeleteDictDataDto } from './dto/dictData'

@Injectable()
export class DictionaryService {
  private dictTypeQueryBuilder: QueryBuilderHelper<DictType>
  private dictDataQueryBuilder: QueryBuilderHelper<DictData>
  constructor(
    @InjectRepository(DictType)
    private readonly dictTypeRepository: Repository<DictType>,
    @InjectRepository(DictData)
    private readonly dictDataRepository: Repository<DictData>,
    private readonly queryBuilderFactory: QueryBuilderFactory,
  ) {
    this.dictTypeQueryBuilder = this.queryBuilderFactory.createFromRepository(this.dictTypeRepository)
    this.dictDataQueryBuilder = this.queryBuilderFactory.createFromRepository(this.dictDataRepository)
  }
  /**
   * 分页查询字典类型列表
   */
  async findAllTypes(query: GetDictTypeDto) {
    const { page, pageSize, name, status, sort } = query

    const conditions: QueryCondition[] = []
    const orderBy = []
    if (name) {
      conditions.push({ field: 'dictType.name', operator: 'like', value: `%${name}%` })
    }
    if (status) {
      conditions.push({ field: 'dictType.status', operator: 'eq', value: status })
    }
    if (sort) {
      orderBy.push({ field: 'dictType.updatedAt', direction: sort.toUpperCase() })
    }

    return await this.dictTypeQueryBuilder.findPaginated(
      {
        alias: 'dictType',
        conditions,
        orderBy,
        joins: [{ property: 'dictType.data', alias: 'dd', type: 'leftJoin' }],
        select: [
          'dictType.id as id',
          'dictType.name as name',
          'dictType.status as status',
          'dictType.description as description',
          'dictType.createdAt as createdAt',
          'dictType.updatedAt as updatedAt',
          'COUNT(dd.id) as count',
        ],
        groupBy: ['dictType.id'],
      },
      page,
      pageSize,
    )
  }
  async createType(createTypeDto: CreateDictTypeDto) {
    return await this.dictTypeRepository.insert(createTypeDto)
  }
  async updateType(updateTypeDto: UpdateDictTypeDto) {
    const { id } = updateTypeDto
    await this.dictTypeRepository
      .createQueryBuilder('dictType')
      .update()
      .set(updateTypeDto)
      .where('id = :id', { id })
      .execute()
  }
  async deleteType(id: number) {
    return await this.dictTypeRepository.createQueryBuilder('dictType').delete().where('id = :id', { id }).execute()
  }

  // 查询字典类型
  async findTypeById(id: number) {
    return await this.dictTypeRepository.findOne({
      where: { id },
    })
  }

  /**分页查询字典数据*/
  async findAllData(query: GetDictDataDto) {
    const { page, pageSize, name, value, status, sort, typeId } = query
    const conditions: QueryCondition[] = [
      {
        field: 'dd.typeId',
        operator: 'eq',
        value: typeId,
      },
    ]
    const orderBy = []
    if (name) {
      conditions.push({ field: 'dd.name', operator: 'like', value: `%${name}%` })
    }
    if (value) {
      conditions.push({ field: 'dd.value', operator: 'like', value: `%${value}%` })
    }
    if (status) {
      conditions.push({ field: 'dd.status', operator: 'eq', value: status })
    }
    // 默认按sortOrder排序
    if (sort) {
      orderBy.push({ field: 'dd.updatedAt', direction: sort.toUpperCase() })
    } else {
      orderBy.push({ field: 'dd.sortOrder', direction: 'ASC' })
    }
    return await this.dictDataQueryBuilder.findPaginated(
      {
        alias: 'dd',
        conditions,
        orderBy,
      },
      page,
      pageSize,
    )
  }
  async createData(createDataDto: CreateDictDataDto) {
    const dictType = await this.findTypeById(createDataDto.typeId)
    if (!dictType) {
      throw new BadRequestException('字典类型不存在')
    }
    await this.dictDataRepository
      .createQueryBuilder()
      .insert()
      .values({
        ...createDataDto,
        type: dictType,
      })
      .execute()
    return null
  }
  async updateData(updateDataDto: UpdateDictDataDto) {
    const { id, typeId, ...rest } = updateDataDto
    const dictType = await this.findTypeById(typeId)
    if (!dictType) {
      throw new BadRequestException('字典类型不存在')
    }
    await this.dictDataRepository.createQueryBuilder('dictData').update().set(rest).where('id = :id', { id }).execute()
    return null
  }
  async deleteData(deleteDataDto: DeleteDictDataDto) {
    const { id, typeId } = deleteDataDto
    const dictType = await this.findTypeById(typeId)
    if (!dictType) {
      throw new BadRequestException('字典类型不存在')
    }
    await this.dictDataRepository.createQueryBuilder('dictData').delete().where('id = :id', { id }).execute()
    return null
  }
}
