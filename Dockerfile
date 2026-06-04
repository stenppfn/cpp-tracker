FROM node:18-alpine

# 安装PM2用于进程管理
RUN npm install -g pm2

# 设置工作目录
WORKDIR /app

# 复制后端代码
COPY server /app/server

# 安装后端依赖
WORKDIR /app/server
RUN npm install --production

# 复制前端构建文件
COPY dist /app/frontend

# 暴露端口
EXPOSE 3002

# 启动API服务
CMD ["pm2-runtime", "start", "api-server.js", "--name", "cpp-tracker-api"]
