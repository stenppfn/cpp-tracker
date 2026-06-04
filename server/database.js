/**
 * 数据库管理模块
 * 使用 SQLite3 存储所有学习追踪数据
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'data', 'knowledge-tracker.db');

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用外键约束
db.pragma('foreign_keys = ON');

/**
 * 初始化数据库表结构
 */
function initializeDatabase() {
  console.log('正在初始化数据库...');

  // 创建 children 表（孩子信息）
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      grade TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 创建 knowledge 表（知识点）
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      status TEXT NOT NULL CHECK(status IN ('not_started', 'learning', 'mastered', 'forgotten')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_review TEXT,
      review_count INTEGER DEFAULT 0,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    )
  `);

  // 创建 learning_records 表（学习记录）
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_records (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      knowledge_id TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge(id) ON DELETE CASCADE
    )
  `);

  // 创建 exam_records 表（考试记录）
  db.exec(`
    CREATE TABLE IF NOT EXISTS exam_records (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      score INTEGER,
      total_score INTEGER,
      level TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    )
  `);

  // 创建 knowledge_versions 表（知识点版本历史）
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      status TEXT NOT NULL,
      snapshot_data TEXT,  -- JSON格式存储完整知识点数据
      created_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge(id) ON DELETE CASCADE
    )
  `);

  // 创建 indexes 以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_child_id ON knowledge(child_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge(status);
    CREATE INDEX IF NOT EXISTS idx_learning_records_child_id ON learning_records(child_id);
    CREATE INDEX IF NOT EXISTS idx_learning_records_knowledge_id ON learning_records(knowledge_id);
    CREATE INDEX IF NOT EXISTS idx_exam_records_child_id ON exam_records(child_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_versions_knowledge_id ON knowledge_versions(knowledge_id);
  `);

  console.log('数据库初始化完成');
}

/**
 * 生成唯一ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ Children API ============

/**
 * 获取所有孩子
 */
function getAllChildren() {
  const stmt = db.prepare('SELECT * FROM children ORDER BY created_at DESC');
  return stmt.all();
}

/**
 * 根据ID获取孩子信息
 */
function getChildById(childId) {
  const stmt = db.prepare('SELECT * FROM children WHERE id = ?');
  return stmt.get(childId);
}

/**
 * 创建新孩子
 */
function createChild(childData) {
  const { id = generateId(), name, age, grade } = childData;

  const stmt = db.prepare(`
    INSERT INTO children (id, name, age, grade)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, name, age, grade);

  return getChildById(id);
}

/**
 * 更新孩子信息
 */
function updateChild(childId, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.age !== undefined) {
    fields.push('age = ?');
    values.push(updates.age);
  }
  if (updates.grade !== undefined) {
    fields.push('grade = ?');
    values.push(updates.grade);
  }

  if (fields.length === 0) {
    return getChildById(childId);
  }

  fields.push("updated_at = datetime('now')");
  values.push(childId);

  const stmt = db.prepare(`
    UPDATE children
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return getChildById(childId);
}

/**
 * 删除孩子
 */
function deleteChild(childId) {
  const stmt = db.prepare('DELETE FROM children WHERE id = ?');
  const result = stmt.run(childId);
  return result.changes > 0;
}

// ============ Knowledge API ============

/**
 * 获取孩子的所有知识点
 */
function getKnowledgeByChild(childId) {
  const stmt = db.prepare('SELECT * FROM knowledge WHERE child_id = ? ORDER BY created_at DESC');
  return stmt.all(childId);
}

/**
 * 根据ID获取知识点
 */
function getKnowledgeById(knowledgeId) {
  const stmt = db.prepare('SELECT * FROM knowledge WHERE id = ?');
  return stmt.get(knowledgeId);
}

/**
 * 创建知识点
 */
function createKnowledge(childId, knowledgeData) {
  const {
    id = generateId(),
    title,
    category,
    status = 'not_started',
    createdAt,
    lastReview,
    reviewCount = 0
  } = knowledgeData;

  const stmt = db.prepare(`
    INSERT INTO knowledge (id, child_id, title, category, status, created_at, last_review, review_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    childId,
    title,
    category || null,
    status,
    createdAt || new Date().toISOString(),
    lastReview || null,
    reviewCount
  );

  return getKnowledgeById(id);
}

/**
 * 批量创建知识点
 */
function batchCreateKnowledge(childId, knowledgeList) {
  const insertStmt = db.prepare(`
    INSERT INTO knowledge (id, child_id, title, category, status, created_at, last_review, review_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    const results = [];
    for (const item of items) {
      const id = item.id || generateId();
      insertStmt.run(
        id,
        childId,
        item.title,
        item.category || null,
        item.status || 'not_started',
        item.createdAt || new Date().toISOString(),
        item.lastReview || null,
        item.reviewCount || 0
      );
      results.push(getKnowledgeById(id));
    }
    return results;
  });

  return insertMany(knowledgeList);
}

/**
 * 更新知识点
 */
function updateKnowledge(knowledgeId, updates) {
  const fields = [];
  const values = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.lastReview !== undefined) {
    fields.push('last_review = ?');
    values.push(updates.lastReview);
  }
  if (updates.reviewCount !== undefined) {
    fields.push('review_count = ?');
    values.push(updates.reviewCount);
  }

  if (fields.length === 0) {
    return getKnowledgeById(knowledgeId);
  }

  fields.push("updated_at = datetime('now')");
  values.push(knowledgeId);

  const stmt = db.prepare(`
    UPDATE knowledge
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return getKnowledgeById(knowledgeId);
}

/**
 * 删除知识点
 */
function deleteKnowledge(knowledgeId) {
  const stmt = db.prepare('DELETE FROM knowledge WHERE id = ?');
  const result = stmt.run(knowledgeId);
  return result.changes > 0;
}

/**
 * 删除孩子的所有知识点
 */
function deleteKnowledgeByChild(childId) {
  const stmt = db.prepare('DELETE FROM knowledge WHERE child_id = ?');
  const result = stmt.run(childId);
  return result.changes;
}

// ============ Learning Records API ============

/**
 * 获取孩子的学习记录
 */
function getLearningRecordsByChild(childId) {
  const stmt = db.prepare('SELECT * FROM learning_records WHERE child_id = ? ORDER BY date DESC');
  return stmt.all(childId);
}

/**
 * 获取知识点的学习记录
 */
function getLearningRecordsByKnowledge(knowledgeId) {
  const stmt = db.prepare('SELECT * FROM learning_records WHERE knowledge_id = ? ORDER BY date DESC');
  return stmt.all(knowledgeId);
}

/**
 * 创建学习记录
 */
function createLearningRecord(childId, recordData) {
  const {
    id = generateId(),
    knowledgeId,
    date,
    duration,
    notes
  } = recordData;

  const stmt = db.prepare(`
    INSERT INTO learning_records (id, child_id, knowledge_id, date, duration, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    childId,
    knowledgeId,
    date,
    duration || null,
    notes || null
  );

  const selectStmt = db.prepare('SELECT * FROM learning_records WHERE id = ?');
  return selectStmt.get(id);
}

/**
 * 批量创建学习记录
 */
function batchCreateLearningRecords(childId, records) {
  const insertStmt = db.prepare(`
    INSERT INTO learning_records (id, child_id, knowledge_id, date, duration, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    const results = [];
    for (const item of items) {
      const id = item.id || generateId();
      insertStmt.run(
        id,
        childId,
        item.knowledgeId,
        item.date,
        item.duration || null,
        item.notes || null
      );
      const selectStmt = db.prepare('SELECT * FROM learning_records WHERE id = ?');
      results.push(selectStmt.get(id));
    }
    return results;
  });

  return insertMany(records);
}

/**
 * 删除学习记录
 */
function deleteLearningRecord(recordId) {
  const stmt = db.prepare('DELETE FROM learning_records WHERE id = ?');
  const result = stmt.run(recordId);
  return result.changes > 0;
}

/**
 * 删除孩子的所有学习记录
 */
function deleteLearningRecordsByChild(childId) {
  const stmt = db.prepare('DELETE FROM learning_records WHERE child_id = ?');
  const result = stmt.run(childId);
  return result.changes;
}

// ============ Exam Records API ============

/**
 * 获取孩子的考试记录
 */
function getExamRecordsByChild(childId) {
  const stmt = db.prepare('SELECT * FROM exam_records WHERE child_id = ? ORDER BY exam_date DESC');
  return stmt.all(childId);
}

/**
 * 创建考试记录
 */
function createExamRecord(childId, examData) {
  const {
    id = generateId(),
    examDate,
    examType,
    score,
    totalScore,
    level,
    notes
  } = examData;

  const stmt = db.prepare(`
    INSERT INTO exam_records (id, child_id, exam_date, exam_type, score, total_score, level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    childId,
    examDate,
    examType,
    score || null,
    totalScore || null,
    level || null,
    notes || null
  );

  const selectStmt = db.prepare('SELECT * FROM exam_records WHERE id = ?');
  return selectStmt.get(id);
}

/**
 * 批量创建考试记录
 */
function batchCreateExamRecords(childId, exams) {
  const insertStmt = db.prepare(`
    INSERT INTO exam_records (id, child_id, exam_date, exam_type, score, total_score, level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    const results = [];
    for (const item of items) {
      const id = item.id || generateId();
      insertStmt.run(
        id,
        childId,
        item.examDate,
        item.examType,
        item.score || null,
        item.totalScore || null,
        item.level || null,
        item.notes || null
      );
      const selectStmt = db.prepare('SELECT * FROM exam_records WHERE id = ?');
      results.push(selectStmt.get(id));
    }
    return results;
  });

  return insertMany(exams);
}

/**
 * 删除考试记录
 */
function deleteExamRecord(examId) {
  const stmt = db.prepare('DELETE FROM exam_records WHERE id = ?');
  const result = stmt.run(examId);
  return result.changes > 0;
}

/**
 * 删除孩子的所有考试记录
 */
function deleteExamRecordsByChild(childId) {
  const stmt = db.prepare('DELETE FROM exam_records WHERE child_id = ?');
  const result = stmt.run(childId);
  return result.changes;
}

// ============ Knowledge Versions API ============

/**
 * 保存知识点版本
 */
function saveKnowledgeVersion(knowledgeId, versionData) {
  const {
    version,
    title,
    category,
    status,
    snapshotData,
    notes
  } = versionData;

  const stmt = db.prepare(`
    INSERT INTO knowledge_versions (knowledge_id, version, title, category, status, snapshot_data, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    knowledgeId,
    version,
    title,
    category,
    status,
    snapshotData,
    notes || null
  );

  const selectStmt = db.prepare('SELECT * FROM knowledge_versions WHERE rowid = ?');
  return selectStmt.get(result.lastInsertRowid);
}

/**
 * 获取知识点版本历史
 */
function getKnowledgeVersions(knowledgeId) {
  const stmt = db.prepare('SELECT * FROM knowledge_versions WHERE knowledge_id = ? ORDER BY version DESC');
  return stmt.all(knowledgeId);
}

/**
 * 删除知识点版本
 */
function deleteKnowledgeVersions(knowledgeId) {
  const stmt = db.prepare('DELETE FROM knowledge_versions WHERE knowledge_id = ?');
  const result = stmt.run(knowledgeId);
  return result.changes;
}

// ============ Utility Functions ============

/**
 * 获取数据库统计信息
 */
function getDatabaseStats() {
  const childCount = db.prepare('SELECT COUNT(*) as count FROM children').get();
  const knowledgeCount = db.prepare('SELECT COUNT(*) as count FROM knowledge').get();
  const recordCount = db.prepare('SELECT COUNT(*) as count FROM learning_records').get();
  const examCount = db.prepare('SELECT COUNT(*) as count FROM exam_records').get();

  return {
    children: childCount.count,
    knowledge: knowledgeCount.count,
    learningRecords: recordCount.count,
    examRecords: examCount.count
  };
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  db.close();
  console.log('数据库连接已关闭');
}

/**
 * 导出所有数据
 */
function exportAllData() {
  const children = getAllChildren();

  const result = {
    children,
    knowledgeData: {},
    learningRecords: {},
    examRecords: {}
  };

  for (const child of children) {
    result.knowledgeData[child.id] = getKnowledgeByChild(child.id);
    result.learningRecords[child.id] = getLearningRecordsByChild(child.id);
    result.examRecords[child.id] = getExamRecordsByChild(child.id);
  }

  return result;
}

/**
 * 导入数据
 */
function importData(data) {
  const importStmt = db.transaction((importData) => {
    const { children, knowledgeData, learningRecords, examRecords } = importData;

    // 导入孩子数据
    for (const child of children) {
      const existingChild = getChildById(child.id);
      if (!existingChild) {
        createChild(child);
      }
    }

    // 导入知识点数据
    for (const childId in knowledgeData) {
      const knowledgeList = knowledgeData[childId];
      for (const knowledge of knowledgeList) {
        const existing = getKnowledgeById(knowledge.id);
        if (!existing) {
          createKnowledge(childId, knowledge);
        }
      }
    }

    // 导入学习记录
    for (const childId in learningRecords) {
      const records = learningRecords[childId];
      for (const record of records) {
        const existing = db.prepare('SELECT * FROM learning_records WHERE id = ?').get(record.id);
        if (!existing) {
          createLearningRecord(childId, record);
        }
      }
    }

    // 导入考试记录
    for (const childId in examRecords) {
      const exams = examRecords[childId];
      for (const exam of exams) {
        const existing = db.prepare('SELECT * FROM exam_records WHERE id = ?').get(exam.id);
        if (!existing) {
          createExamRecord(childId, exam);
        }
      }
    }

    return { success: true, imported: children.length };
  });

  return importStmt(data);
}

// 初始化数据库
initializeDatabase();

module.exports = {
  // Children
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,

  // Knowledge
  getKnowledgeByChild,
  getKnowledgeById,
  createKnowledge,
  batchCreateKnowledge,
  updateKnowledge,
  deleteKnowledge,
  deleteKnowledgeByChild,

  // Learning Records
  getLearningRecordsByChild,
  getLearningRecordsByKnowledge,
  createLearningRecord,
  batchCreateLearningRecords,
  deleteLearningRecord,
  deleteLearningRecordsByChild,

  // Exam Records
  getExamRecordsByChild,
  createExamRecord,
  batchCreateExamRecords,
  deleteExamRecord,
  deleteExamRecordsByChild,

  // Knowledge Versions
  saveKnowledgeVersion,
  getKnowledgeVersions,
  deleteKnowledgeVersions,

  // Utility
  getDatabaseStats,
  closeDatabase,
  exportAllData,
  importData,
  generateId
};
