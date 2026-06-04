/**
 * API Server
 * 提供数据持久化 API，使用 SQLite3 数据库
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

// 数据库文件路径（用于显示）
const DB_PATH = path.join(__dirname, 'data', 'knowledge-tracker.db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 配置
const CONFIG = {
  port: process.env.API_PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development'
};

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============ Health Check ============

app.get('/api/health', (req, res) => {
  const stats = db.getDatabaseStats();
  res.json({
    status: 'ok',
    service: 'Knowledge Tracker API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: stats
  });
});

// ============ Children Routes ============

/**
 * 获取所有孩子
 * GET /api/children
 */
app.get('/api/children', (req, res) => {
  try {
    const children = db.getAllChildren();
    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    console.error('获取孩子列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个孩子信息
 * GET /api/children/:id
 */
app.get('/api/children/:id', (req, res) => {
  try {
    const { id } = req.params;
    const child = db.getChildById(id);

    if (!child) {
      return res.status(404).json({
        success: false,
        error: '未找到该孩子'
      });
    }

    res.json({
      success: true,
      data: child
    });
  } catch (error) {
    console.error('获取孩子信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建新孩子
 * POST /api/children
 */
app.post('/api/children', (req, res) => {
  try {
    const childData = req.body;

    // 验证必需字段
    if (!childData.name || childData.age === undefined) {
      return res.status(400).json({
        success: false,
        error: '姓名和年龄为必填字段'
      });
    }

    const child = db.createChild(childData);

    res.status(201).json({
      success: true,
      data: child
    });
  } catch (error) {
    console.error('创建孩子失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新孩子信息
 * PUT /api/children/:id
 */
app.put('/api/children/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const child = db.updateChild(id, updates);

    if (!child) {
      return res.status(404).json({
        success: false,
        error: '未找到该孩子'
      });
    }

    res.json({
      success: true,
      data: child
    });
  } catch (error) {
    console.error('更新孩子信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除孩子
 * DELETE /api/children/:id
 */
app.delete('/api/children/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteChild(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '未找到该孩子'
      });
    }

    res.json({
      success: true,
      message: '孩子及相关数据已删除'
    });
  } catch (error) {
    console.error('删除孩子失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Knowledge Routes ============

/**
 * 获取孩子的所有知识点
 * GET /api/children/:id/knowledge
 */
app.get('/api/children/:id/knowledge', (req, res) => {
  try {
    const { id } = req.params;
    const knowledge = db.getKnowledgeByChild(id);

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('获取知识点失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个知识点
 * GET /api/knowledge/:id
 */
app.get('/api/knowledge/:id', (req, res) => {
  try {
    const { id } = req.params;
    const knowledge = db.getKnowledgeById(id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        error: '未找到该知识点'
      });
    }

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('获取知识点失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建知识点
 * POST /api/children/:id/knowledge
 */
app.post('/api/children/:id/knowledge', (req, res) => {
  try {
    const { id } = req.params;
    const knowledgeData = req.body;

    if (!knowledgeData.title) {
      return res.status(400).json({
        success: false,
        error: '知识点标题为必填字段'
      });
    }

    const knowledge = db.createKnowledge(id, knowledgeData);

    res.status(201).json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('创建知识点失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量创建知识点
 * POST /api/children/:id/knowledge/batch
 */
app.post('/api/children/:id/knowledge/batch', (req, res) => {
  try {
    const { id } = req.params;
    const { knowledge } = req.body;

    if (!Array.isArray(knowledge) || knowledge.length === 0) {
      return res.status(400).json({
        success: false,
        error: '知识点列表不能为空'
      });
    }

    const results = db.batchCreateKnowledge(id, knowledge);

    res.status(201).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('批量创建知识点失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新知识点
 * PUT /api/knowledge/:id
 */
app.put('/api/knowledge/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const knowledge = db.updateKnowledge(id, updates);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        error: '未找到该知识点'
      });
    }

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('更新知识点失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除知识点
 * DELETE /api/knowledge/:id
 */
app.delete('/api/knowledge/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteKnowledge(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '未找到该知识点'
      });
    }

    res.json({
      success: true,
      message: '知识点已删除'
    });
  } catch (error) {
    console.error('删除知识点失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Learning Records Routes ============

/**
 * 获取孩子的学习记录
 * GET /api/children/:id/learning-records
 */
app.get('/api/children/:id/learning-records', (req, res) => {
  try {
    const { id } = req.params;
    const records = db.getLearningRecordsByChild(id);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('获取学习记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取知识点的学习记录
 * GET /api/knowledge/:id/learning-records
 */
app.get('/api/knowledge/:id/learning-records', (req, res) => {
  try {
    const { id } = req.params;
    const records = db.getLearningRecordsByKnowledge(id);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('获取学习记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建学习记录
 * POST /api/children/:id/learning-records
 */
app.post('/api/children/:id/learning-records', (req, res) => {
  try {
    const { id } = req.params;
    const recordData = req.body;

    if (!recordData.knowledgeId || !recordData.date) {
      return res.status(400).json({
        success: false,
        error: 'knowledgeId 和 date 为必填字段'
      });
    }

    const record = db.createLearningRecord(id, recordData);

    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('创建学习记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量创建学习记录
 * POST /api/children/:id/learning-records/batch
 */
app.post('/api/children/:id/learning-records/batch', (req, res) => {
  try {
    const { id } = req.params;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: '学习记录列表不能为空'
      });
    }

    const results = db.batchCreateLearningRecords(id, records);

    res.status(201).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('批量创建学习记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除学习记录
 * DELETE /api/learning-records/:id
 */
app.delete('/api/learning-records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteLearningRecord(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '未找到该学习记录'
      });
    }

    res.json({
      success: true,
      message: '学习记录已删除'
    });
  } catch (error) {
    console.error('删除学习记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Exam Records Routes ============

/**
 * 获取孩子的考试记录
 * GET /api/children/:id/exam-records
 */
app.get('/api/children/:id/exam-records', (req, res) => {
  try {
    const { id } = req.params;
    const records = db.getExamRecordsByChild(id);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('获取考试记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建考试记录
 * POST /api/children/:id/exam-records
 */
app.post('/api/children/:id/exam-records', (req, res) => {
  try {
    const { id } = req.params;
    const examData = req.body;

    if (!examData.examDate || !examData.examType) {
      return res.status(400).json({
        success: false,
        error: 'examDate 和 examType 为必填字段'
      });
    }

    const exam = db.createExamRecord(id, examData);

    res.status(201).json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('创建考试记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量创建考试记录
 * POST /api/children/:id/exam-records/batch
 */
app.post('/api/children/:id/exam-records/batch', (req, res) => {
  try {
    const { id } = req.params;
    const { exams } = req.body;

    if (!Array.isArray(exams) || exams.length === 0) {
      return res.status(400).json({
        success: false,
        error: '考试记录列表不能为空'
      });
    }

    const results = db.batchCreateExamRecords(id, exams);

    res.status(201).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('批量创建考试记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除考试记录
 * DELETE /api/exam-records/:id
 */
app.delete('/api/exam-records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteExamRecord(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '未找到该考试记录'
      });
    }

    res.json({
      success: true,
      message: '考试记录已删除'
    });
  } catch (error) {
    console.error('删除考试记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Knowledge Versions Routes ============

/**
 * 获取知识点版本历史
 * GET /api/knowledge/:id/versions
 */
app.get('/api/knowledge/:id/versions', (req, res) => {
  try {
    const { id } = req.params;
    const versions = db.getKnowledgeVersions(id);

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    console.error('获取知识点版本失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 保存知识点版本
 * POST /api/knowledge/:id/versions
 */
app.post('/api/knowledge/:id/versions', (req, res) => {
  try {
    const { id } = req.params;
    const versionData = req.body;

    if (versionData.version === undefined) {
      return res.status(400).json({
        success: false,
        error: 'version 为必填字段'
      });
    }

    const version = db.saveKnowledgeVersion(id, versionData);

    res.status(201).json({
      success: true,
      data: version
    });
  } catch (error) {
    console.error('保存知识点版本失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除知识点版本
 * DELETE /api/knowledge/:id/versions
 */
app.delete('/api/knowledge/:id/versions', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteKnowledgeVersions(id);

    res.json({
      success: true,
      message: `已删除 ${deleted} 个版本记录`
    });
  } catch (error) {
    console.error('删除知识点版本失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Data Export/Import Routes ============

/**
 * 导出所有数据
 * GET /api/data/export
 */
app.get('/api/data/export', (req, res) => {
  try {
    const data = db.exportAllData();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 导入数据
 * POST /api/data/import
 */
app.post('/api/data/import', (req, res) => {
  try {
    const data = req.body;

    if (!data.children || !Array.isArray(data.children)) {
      return res.status(400).json({
        success: false,
        error: '无效的数据格式'
      });
    }

    const result = db.importData(data);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('导入数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Stats Routes ============

/**
 * 获取数据库统计信息
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getDatabaseStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Error Handling ============

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '未找到请求的端点',
    path: req.path,
    method: req.method
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message,
    stack: CONFIG.nodeEnv === 'development' ? err.stack : undefined
  });
});

// ============ Start Server ============

app.listen(CONFIG.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   Knowledge Tracker API Server                        ║
║   服务运行在 http://localhost:${CONFIG.port}                    ║
╠═══════════════════════════════════════════════════════╣
║   可用端点:                                            ║
║   - GET    /api/health                                ║
║   - GET    /api/stats                                 ║
║                                                        ║
║   Children:                                            ║
║   - GET    /api/children                              ║
║   - POST   /api/children                              ║
║   - GET    /api/children/:id                          ║
║   - PUT    /api/children/:id                          ║
║   - DELETE /api/children/:id                          ║
║                                                        ║
║   Knowledge:                                           ║
║   - GET    /api/children/:id/knowledge                ║
║   - POST   /api/children/:id/knowledge                ║
║   - POST   /api/children/:id/knowledge/batch          ║
║   - GET    /api/knowledge/:id                         ║
║   - PUT    /api/knowledge/:id                         ║
║   - DELETE /api/knowledge/:id                         ║
║                                                        ║
║   Learning Records:                                    ║
║   - GET    /api/children/:id/learning-records         ║
║   - POST   /api/children/:id/learning-records         ║
║   - POST   /api/children/:id/learning-records/batch   ║
║   - DELETE /api/learning-records/:id                  ║
║                                                        ║
║   Exam Records:                                        ║
║   - GET    /api/children/:id/exam-records             ║
║   - POST   /api/children/:id/exam-records             ║
║   - POST   /api/children/:id/exam-records/batch       ║
║   - DELETE /api/exam-records/:id                      ║
║                                                        ║
║   Data Import/Export:                                  ║
║   - GET    /api/data/export                           ║
║   - POST   /api/data/import                           ║
╠═══════════════════════════════════════════════════════╣
║   数据库文件: ${DB_PATH}     ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
