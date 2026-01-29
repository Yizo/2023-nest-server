#!/bin/bash

echo "🚀 启动 NestJS 应用..."

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
until nc -z mysql 3306; do
  echo "数据库还未就绪，等待中..."
  sleep 2
done

echo "✅ 数据库已就绪"

# 等待 Redis 就绪
echo "⏳ 等待 Redis 就绪..."
until nc -z redis 6379; do
  echo "Redis还未就绪，等待中..."
  sleep 2
done

echo "✅ Redis 已就绪"

# 检查数据库表是否存在
echo "🔍 检查数据库表是否存在..."
TABLE_COUNT=$(mysql -h mysql -u root -pnest_admin_2024_secure -e "USE nest_admin; SHOW TABLES;" 2>/dev/null | grep -E "(user|role|permission)" | wc -l)

if [ "$TABLE_COUNT" -lt "3" ]; then
  echo "📋 数据库核心表不完整，开始初始化..."
  npm run db:init
else
  echo "📋 数据库表已存在且完整，检查是否有待执行的迁移..."
  # 检查是否有迁移文件
  if [ -d "scripts/migrations" ] && [ "$(ls -A scripts/migrations 2>/dev/null)" ]; then
    echo "🔄 发现迁移文件，运行数据库迁移..."
    npm run migration:run
  else
    echo "✅ 数据库表已存在且无待执行迁移，跳过数据库操作"
  fi
fi

# 启动应用
echo "🎯 启动应用..."
if [ "$NODE_ENV" = "development" ]; then
  exec npm run start:dev
else
  exec node dist/src/main.js
fi
