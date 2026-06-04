#!/bin/bash
# cpp-tracker 部署脚本
set -e
cd /var/www/cpp-tracker

# 备份数据库
cp server/data/knowledge-tracker.db server/data/knowledge-tracker.db.bak 2>/dev/null || true

echo ">>> 拉取最新代码..."
git pull origin master

# 恢复数据库（git pull 不会覆盖，但以防万一）
cp server/data/knowledge-tracker.db.bak server/data/knowledge-tracker.db 2>/dev/null || true

echo ">>> 安装依赖..."
cd server && npm install --production && cd ..

echo ">>> 重启后端服务..."
pkill -f "node.*api-server.js" || true
sleep 1
cd server
nohup node api-server.js >> /var/log/cpp-tracker.log 2>&1 &
cd ..

echo ">>> 重载 nginx..."
nginx -t && systemctl reload nginx

echo ">>> 部署完成!"
