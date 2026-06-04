const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PORT = 9000;
const SECRET = 'cpp-tracker-deploy-2024';
const DEPLOY_SCRIPT = '/var/www/cpp-tracker/deploy.sh';

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(200);
    return res.end('ok');
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // 验证 GitHub 签名
    const sig = req.headers['x-hub-signature-256'];
    const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    if (sig !== expected) {
      console.log('[WARN] 签名验证失败');
      res.writeHead(403);
      return res.end('forbidden');
    }

    const payload = JSON.parse(body);
    if (payload.ref !== 'refs/heads/master') {
      console.log('[INFO] 非 master 分支，跳过');
      res.writeHead(200);
      return res.end('skipped');
    }

    console.log(`[DEPLOY] 收到 push，开始部署... ${new Date().toISOString()}`);
    try {
      const output = execSync(`bash ${DEPLOY_SCRIPT}`, { encoding: 'utf8', timeout: 120000 });
      console.log('[OK] 部署成功\n' + output);
      res.writeHead(200);
      res.end('deployed');
    } catch (e) {
      console.log('[ERROR] 部署失败\n' + e.message);
      res.writeHead(500);
      res.end('failed');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook 接收器已启动，监听端口 ${PORT}`);
});
