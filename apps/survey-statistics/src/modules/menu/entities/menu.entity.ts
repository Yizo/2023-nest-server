import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { MenuNodeType } from '@/enums/menu'

@Entity('menu')
export class Menu {
  @PrimaryGeneratedColumn({ comment: 'ID' })
  id: number

  @Column({ comment: '父节点ID, 可选', nullable: true, default: null })
  parentId: number | null

  @Column({ comment: '节点名称, 必选', nullable: false })
  name: string

  @Column({ comment: '权限标识, 必选且唯一', unique: true, nullable: false })
  permission: string

  @Column({ comment: '节点路由地址, 可选', nullable: true, default: '' })
  route: string

  @Column({ comment: '节点图标, 可选', nullable: true, default: '' })
  icon: string

  @Column({ comment: '节点组件地址, 可选', nullable: true, default: '' })
  component: string

  @Column({ comment: '节点重定向地址, 可选', nullable: true, default: '' })
  redirect: string

  @Column({ comment: '节点排序, 越小越靠前', default: 0 })
  order: number

  @Column({ comment: '节点状态, 0: 禁用, 1: 启用', default: 1 })
  status: number

  @Column({ comment: '节点类型, 0: 页面, 1: 目录 2: 菜单 3: 按钮', nullable: false, default: MenuNodeType.Menu })
  nodeType: MenuNodeType

  @Column({ comment: '是否内嵌, 0: 否, 1: 是', default: 0 })
  isIframe: number

  @Column({ comment: '是否外链, 0: 否, 1: 是', default: 0 })
  isLink: number

  @Column({ comment: '是否可见, 0: 否, 1: 是', default: 0 })
  visible: number

  @Column({ comment: '是否缓存, 0: 否, 1: 是', default: 0 })
  isCache: number

  @Column({ comment: '备注, 可选', nullable: true, default: '' })
  remark: string

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date

  @Column({ comment: '创建者', nullable: false })
  createdBy: string

  @Column({ comment: '更新者', nullable: false })
  updatedBy: string
}
