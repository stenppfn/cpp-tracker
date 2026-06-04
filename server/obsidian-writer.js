/**
 * Obsidian Writer Service
 * 用于保存Markdown文件到Obsidian库的Node.js后端服务
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 配置
const CONFIG = {
  port: process.env.PORT || 3001,
  defaultVaultPath: process.env.OBSIDIAN_VAULT_PATH || null
};

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Obsidian Writer',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * 保存Markdown文件到Obsidian库
 * POST /api/save-markdown
 *
 * Request Body:
 * {
 *   "content": "markdown content",
 *   "filename": "feedback_学生名_2024-01-27.md",
 *   "vaultPath": "D:\\Obsidian\\KnowledgeTracker" (可选)
 * }
 */
app.post('/api/save-markdown', (req, res) => {
  try {
    const { content, filename, vaultPath } = req.body;

    // 验证必需参数
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Markdown内容不能为空'
      });
    }

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: '文件名不能为空'
      });
    }

    // 确定目标路径
    const targetPath = vaultPath || CONFIG.defaultVaultPath;

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: '未指定Obsidian库路径，请在请求中提供vaultPath或设置环境变量OBSIDIAN_VAULT_PATH'
      });
    }

    // 确保目录存在
    if (!fs.existsSync(targetPath)) {
      try {
        fs.mkdirSync(targetPath, { recursive: true });
        console.log(`创建目录: ${targetPath}`);
      } catch (mkdirError) {
        return res.status(500).json({
          success: false,
          error: `无法创建目录: ${mkdirError.message}`
        });
      }
    }

    // 验证路径是否存在且是目录
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: `指定的路径不是目录: ${targetPath}`
      });
    }

    // 构建完整文件路径
    const filePath = path.join(targetPath, filename);

    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
      console.log(`文件已存在，将覆盖: ${filePath}`);
    }

    // 保存文件
    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`文件保存成功: ${filePath}`);

    res.json({
      success: true,
      path: filePath,
      filename,
      size: Buffer.byteLength(content, 'utf8'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('保存文件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量保存Markdown文件
 * POST /api/save-markdown-batch
 *
 * Request Body:
 * {
 *   "files": [
 *     { "filename": "file1.md", "content": "..." },
 *     { "filename": "file2.md", "content": "..." }
 *   ],
 *   "vaultPath": "..."
 * }
 */
app.post('/api/save-markdown-batch', (req, res) => {
  try {
    const { files, vaultPath } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '文件列表不能为空'
      });
    }

    const targetPath = vaultPath || CONFIG.defaultVaultPath;

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: '未指定Obsidian库路径'
      });
    }

    // 确保目录存在
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const results = [];

    files.forEach(file => {
      try {
        const { filename, content } = file;
        const filePath = path.join(targetPath, filename);

        fs.writeFileSync(filePath, content, 'utf8');

        results.push({
          filename,
          success: true,
          path: filePath
        });
      } catch (error) {
        results.push({
          filename: file.filename,
          success: false,
          error: error.message
        });
      }
    });

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: successCount > 0,
      total: files.length,
      successCount,
      failedCount: files.length - successCount,
      results
    });
  } catch (error) {
    console.error('批量保存失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取目录中的Markdown文件列表
 * GET /api/list-files?vaultPath=...
 */
app.get('/api/list-files', (req, res) => {
  try {
    const { vaultPath } = req.query;
    const targetPath = vaultPath || CONFIG.defaultVaultPath;

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: '未指定Obsidian库路径'
      });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({
        success: false,
        error: '目录不存在'
      });
    }

    const files = fs.readdirSync(targetPath)
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const filePath = path.join(targetPath, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });

    res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    console.error('列出文件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除Markdown文件
 * DELETE /api/delete-file
 *
 * Request Body:
 * {
 *   "filename": "...",
 *   "vaultPath": "..."
 * }
 */
app.delete('/api/delete-file', (req, res) => {
  try {
    const { filename, vaultPath } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: '文件名不能为空'
      });
    }

    const targetPath = vaultPath || CONFIG.defaultVaultPath;

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: '未指定Obsidian库路径'
      });
    }

    const filePath = path.join(targetPath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '文件删除成功',
      filename
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '未找到请求的端点'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// 启动服务器
app.listen(CONFIG.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   Obsidian Writer Service                             ║
║   服务运行在 http://localhost:${CONFIG.port}                    ║
╠═══════════════════════════════════════════════════════╣
║   可用端点:                                            ║
║   - GET  /api/health                                  ║
║   - POST /api/save-markdown                           ║
║   - POST /api/save-markdown-batch                     ║
║   - GET  /api/list-files                              ║
║   - DELETE /api/delete-file                           ║
╠═══════════════════════════════════════════════════════╣
║   环境变量:                                            ║
║   - OBSIDIAN_VAULT_PATH: ${CONFIG.defaultVaultPath || '未设置'}    ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
