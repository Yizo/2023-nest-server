import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 加载环境变量
config({ path: path.join(__dirname, '../config/config.development.yml') });

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
  entities: [path.join(__dirname, '../src/modules/**/*.entity.ts')],
  migrations: [path.join(__dirname, './migrations/*.ts')],
  synchronize: false, // 生产环境必须设置为 false
  logging: true,
});

/**
 * 数据库迁移管理类
 */
class DatabaseMigration {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * 创建新的迁移文件
   */
  async createMigration(migrationName: string): Promise<void> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0];
    const fileName = `${timestamp}_${migrationName}.ts`;
    const migrationsDir = path.join(__dirname, './migrations');

    // 确保 migrations 目录存在
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const filePath = path.join(migrationsDir, fileName);
    const template = this.getMigrationTemplate(migrationName);

    fs.writeFileSync(filePath, template);
    console.log(`✅ 迁移文件已创建: ${fileName}`);
  }

  /**
   * 运行所有待执行的迁移
   */
  async runMigrations(): Promise<void> {
    try {
      await this.dataSource.initialize();
      console.log('正在运行数据库迁移...');

      const migrations = await this.dataSource.runMigrations();
      console.log(`✅ 成功运行 ${migrations.length} 个迁移`);
    } catch (error) {
      console.error('❌ 迁移执行失败:', error);
      throw error;
    }
  }

  /**
   * 回滚到指定迁移版本
   */
  async rollbackMigration(migrationName?: string): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      if (migrationName) {
        // 回滚到指定版本
        await this.dataSource.undoMigrationTo(migrationName);
        console.log(`✅ 已回滚到迁移版本: ${migrationName}`);
      } else {
        // 回滚最后一个迁移
        await this.dataSource.undoLastMigration();
        console.log('✅ 已回滚最后一个迁移');
      }
    } catch (error) {
      console.error('❌ 迁移回滚失败:', error);
      throw error;
    }
  }

  /**
   * 显示迁移状态
   */
  async showMigrationStatus(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      const migrations = await this.dataSource.showMigrations();
      console.log('📊 迁移状态:');
      console.log(`待执行迁移数量: ${migrations.length}`);

      if (migrations.length > 0) {
        console.log('待执行迁移:');
        migrations.forEach((migration) => {
          console.log(`  - ${migration.name}`);
        });
      } else {
        console.log('所有迁移都已执行完成');
      }
    } catch (error) {
      console.error('❌ 获取迁移状态失败:', error);
      throw error;
    }
  }

  /**
   * 生成实体对应的迁移SQL
   */
  async generateMigrationFromEntities(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      // 同步模式生成迁移（仅用于开发环境）
      await this.dataSource.synchronize();
      console.log('✅ 已根据实体类生成数据库结构');
    } catch (error) {
      console.error('❌ 生成迁移失败:', error);
      throw error;
    }
  }

  /**
   * 获取迁移模板
   */
  private getMigrationTemplate(migrationName: string): string {
    const className = this.toPascalCase(migrationName);
    return `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${className} implements MigrationInterface {
    name = '${className}'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 在这里编写升级数据库的SQL语句
        // 示例：
        // await queryRunner.query(\`ALTER TABLE user ADD COLUMN new_column VARCHAR(255)\`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 在这里编写回滚数据库的SQL语句
        // 示例：
        // await queryRunner.query(\`ALTER TABLE user DROP COLUMN new_column\`);
    }

}
`;
  }

  /**
   * 转换为 PascalCase 命名
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

/**
 * 备份数据库
 */
async function backupDatabase(): Promise<void> {
  try {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const username = process.env.DB_USERNAME || 'root';
    const password = process.env.DB_PASSWORD || 'nest_admin_2024_secure';
    const database = process.env.DB_DATABASE || 'nest_admin';

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const backupFile = path.join(
      backupDir,
      `${database}_backup_${timestamp}.sql`,
    );

    // 使用 mysqldump 命令备份（需要系统安装 MySQL）
    const { exec } = require('child_process');
    const command = `mysqldump -h ${host} -P ${port} -u ${username} -p${password} ${database} > ${backupFile}`;

    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error('❌ 备份失败:', error);
      } else {
        console.log(`✅ 数据库备份成功: ${backupFile}`);
      }
    });
  } catch (error) {
    console.error('❌ 备份过程出错:', error);
  }
}

/**
 * 恢复数据库
 */
async function restoreDatabase(backupFile: string): Promise<void> {
  try {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const username = process.env.DB_USERNAME || 'root';
    const password = process.env.DB_PASSWORD || 'nest_admin_2024_secure';
    const database = process.env.DB_DATABASE || 'nest_admin';

    if (!fs.existsSync(backupFile)) {
      throw new Error(`备份文件不存在: ${backupFile}`);
    }

    // 使用 mysql 命令恢复
    const { exec } = require('child_process');
    const command = `mysql -h ${host} -P ${port} -u ${username} -p${password} ${database} < ${backupFile}`;

    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error('❌ 恢复失败:', error);
      } else {
        console.log(`✅ 数据库恢复成功: ${backupFile}`);
      }
    });
  } catch (error) {
    console.error('❌ 恢复过程出错:', error);
  }
}

/**
 * 命令行工具
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const migration = new DatabaseMigration(AppDataSource);

  try {
    switch (command) {
      case 'create':
        const migrationName = args[1];
        if (!migrationName) {
          console.error(
            '❌ 请提供迁移名称: npm run migration:create -- migration-name',
          );
          process.exit(1);
        }
        await migration.createMigration(migrationName);
        break;

      case 'run':
        await migration.runMigrations();
        break;

      case 'rollback':
        const migrationVersion = args[1];
        await migration.rollbackMigration(migrationVersion);
        break;

      case 'status':
        await migration.showMigrationStatus();
        break;

      case 'generate':
        await migration.generateMigrationFromEntities();
        break;

      case 'backup':
        await backupDatabase();
        break;

      case 'restore':
        const backupFile = args[1];
        if (!backupFile) {
          console.error(
            '❌ 请提供备份文件路径: npm run migration:restore -- backup-file.sql',
          );
          process.exit(1);
        }
        await restoreDatabase(backupFile);
        break;

      default:
        console.log(`
使用方式:
  npm run migration:create -- <migration-name>    创建新的迁移文件
  npm run migration:run                            运行所有待执行的迁移
  npm run migration:rollback -- [version]         回滚到指定版本（可选）
  npm run migration:status                         查看迁移状态
  npm run migration:generate                       根据实体生成迁移（仅开发环境）
  npm run migration:backup                         备份数据库
  npm run migration:restore -- <backup-file>       恢复数据库
        `);
    }
  } catch (error) {
    console.error('操作失败:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export default DatabaseMigration;
