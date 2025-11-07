import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// 加载环境变量
const configPath =
  process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../config/config.production.yml')
    : path.join(__dirname, '../config/config.development.yml');
config({ path: configPath });

// 导入所有实体
import { User } from '../src/modules/user/entities/user.entity';
import { Profile } from '../src/modules/profile/entities/profile.entity';
import { Role } from '../src/modules/roles/entities/roles.entity';
import { Permission } from '../src/modules/permissions/entities/permissions.entity';
import { Logs } from '../src/modules/logs/entities/user.logs.entity';
import { Policy } from '../src/modules/policy/entities/policy.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'nest_admin_2024_secure',
  database: process.env.DB_DATABASE || 'nest_admin',
  entities: [User, Profile, Role, Permission, Logs, Policy],
  synchronize: true, // 初始化时允许自动同步创建表结构
  logging: true,
});

async function initializeDatabase() {
  try {
    console.log('正在初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('数据库连接成功！');

    console.log('正在同步数据库结构...');
    await AppDataSource.synchronize();
    console.log('数据库结构同步完成！');

    // 插入初始数据
    console.log('正在插入初始数据...');
    await insertInitialData();
    console.log('初始数据插入完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

async function insertInitialData() {
  const userRepository = AppDataSource.getRepository(User);
  const roleRepository = AppDataSource.getRepository(Role);
  const permissionRepository = AppDataSource.getRepository(Permission);

  // 检查是否已存在超级管理员角色
  const adminRole = await roleRepository.findOne({
    where: { name: '超级管理员' },
  });

  let superAdminRole = adminRole;
  if (!superAdminRole) {
    superAdminRole = roleRepository.create({
      name: '超级管理员',
      code: 99, // 超级管理员
      status: 1, // 启用
      description: '系统超级管理员，拥有所有权限',
    });
    await roleRepository.save(superAdminRole);
    console.log('已创建超级管理员角色');
  }

  // 检查是否已存在普通用户角色
  const userRole = await roleRepository.findOne({
    where: { name: '普通用户' },
  });

  if (!userRole) {
    await roleRepository.save(
      roleRepository.create({
        name: '普通用户',
        code: 0, // 普通用户
        status: 1, // 启用
        description: '普通用户角色',
      }),
    );
    console.log('已创建普通用户角色');
  }

  // 检查是否已存在管理员用户
  const adminUser = await userRepository.findOne({
    where: { username: 'admin' },
  });

  if (!adminUser) {
    // 简单密码加密（在实际生产环境中应使用 bcrypt）
    const adminPassword = 'admin123'; // 实际使用时应该更复杂
    const normalUserPassword = 'user123';

    // 创建管理员用户
    await userRepository.save(
      userRepository.create({
        username: 'admin',
        password: adminPassword, // 实际使用时需要加密
        status: 1, // 启用
        roles: [superAdminRole],
      }),
    );
    console.log('已创建管理员用户 (admin/admin123)');

    // 创建测试用户
    await userRepository.save(
      userRepository.create({
        username: 'user',
        password: normalUserPassword, // 实际使用时需要加密
        status: 1, // 启用
      }),
    );
    console.log('已创建测试用户 (user/user123)');
  }

  // 创建基础权限数据
  const basePermissions = [
    { name: '用户管理', code: 'user:manage', description: '用户管理权限' },
    { name: '角色管理', code: 'role:manage', description: '角色管理权限' },
    {
      name: '权限管理',
      code: 'permission:manage',
      description: '权限管理权限',
    },
    { name: '系统日志', code: 'log:read', description: '查看系统日志权限' },
  ];

  for (const permData of basePermissions) {
    const existingPerm = await permissionRepository.findOne({
      where: { code: permData.code },
    });

    if (!existingPerm) {
      await permissionRepository.save(
        permissionRepository.create({
          ...permData,
          status: 1, // 启用
        }),
      );
    }
  }
  console.log('已创建基础权限数据');
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

export default AppDataSource;
