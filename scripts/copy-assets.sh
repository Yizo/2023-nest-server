#!/bin/bash

###############################################################################
# NestJS Monorepo Assets 复制脚本
# 根据 nest-cli.json 配置自动复制 assets 文件
###############################################################################

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 开始复制 Assets 文件...${NC}\n"

# 项目根目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 检查 nest-cli.json 是否存在
if [ ! -f "nest-cli.json" ]; then
    echo -e "${RED}❌ 找不到 nest-cli.json 文件${NC}"
    exit 1
fi

# 复制 survey-statistics 的 assets
echo -e "${BLUE}📦 处理项目: survey-statistics${NC}"

# 创建目标目录
mkdir -p "dist/apps/survey-statistics/src/config"
mkdir -p "dist/apps/survey-statistics/src/logs"

# 复制配置文件
if [ -d "apps/survey-statistics/src/config" ]; then
    echo -e "${YELLOW}  [1] config/*.yml${NC}"
    cp apps/survey-statistics/src/config/*.yml dist/apps/survey-statistics/src/config/ 2>/dev/null || true
    cp apps/survey-statistics/src/config/*.yaml dist/apps/survey-statistics/src/config/ 2>/dev/null || true
    
    COUNT=$(ls -1 dist/apps/survey-statistics/src/config/*.yml 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        echo -e "${GREEN}  ✓ 复制了 $COUNT 个配置文件${NC}"
    fi
fi

# 复制 logs 目录的 .gitignore
if [ -f "apps/survey-statistics/src/logs/.gitignore" ]; then
    echo -e "${YELLOW}  [2] logs/.gitignore${NC}"
    cp apps/survey-statistics/src/logs/.gitignore dist/apps/survey-statistics/src/logs/
    echo -e "${GREEN}  ✓ 复制了 .gitignore${NC}"
fi

echo -e "\n${GREEN}✨ Assets 复制完成！${NC}"
