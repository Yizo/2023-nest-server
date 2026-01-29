FROM node:20-alpine AS base
WORKDIR /workspace

RUN npm install -g pnpm pm2

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/survey-statistics/package.json apps/survey-statistics/

RUN pnpm install --filter survey-statistics

COPY . .

WORKDIR /workspace/apps/survey-statistics
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3003
CMD ["pm2-runtime", "--interpreter", "ts-node/register", "pm2.config.ts", "--env", "production"]
