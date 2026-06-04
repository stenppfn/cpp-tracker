#!/bin/bash
# cpp-tracker 部署脚本
# 用法: bash /var/www/cpp-tracker/deploy.sh

set -e
cd /var/www/cpp-tracker

echo ">>> 拉取最新代码..."
git pull origin master

echo ">>> 安装依赖..."
cd server && npm install --production && cd ..

echo ">>> 重启后端服务..."
# 杀掉旧的 node 进程
pkill -f "node.*api-server.js" || true
sleep 1

# 启动新的
cd server
nohup node api-server.js >> /var/log/cpp-tracker.log 2>&1 &
cd ..

echo ">>> 重载 nginx..."
nginx -t && systemctl reload nginx

echo ">>> 部署完成!"
