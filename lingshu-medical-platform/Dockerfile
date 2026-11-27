FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4173

WORKDIR /app/backend

# 安装后端依赖（如果存在 package.json）
COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    elif [ -f package.json ]; then \
      npm install --omit=dev; \
    fi

# 复制后端和根目录下的前端
COPY backend ./
COPY frontend ./frontend

# 创建数据目录并改用非 root 用户运行
RUN mkdir -p /app/backend/data \
    && chown -R node:node /app/backend

USER node

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "--experimental-sqlite", "server.mjs"]
