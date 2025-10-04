const express = require('express');
const rateLimit = require('express-rate-limit');
const { auth, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// AI请求限制
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 每分钟最多10次AI请求
  message: { 
    success: false, 
    message: 'AI请求过于频繁，请稍后再试' 
  }
});

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// AI对话历史存储（实际部署时应该使用数据库）
const conversationHistory = new Map();

// 系统提示词配置
const SYSTEM_PROMPTS = {
  general: `你是CyberSec Academy的专业网络安全教育助手。你的职责是：
1. 帮助学生理解网络安全概念和技术
2. 解答网络安全相关问题
3. 提供学习建议和资源推荐
4. 解释代码和漏洞原理
5. 引导学生进行道德的安全研究

重要规则：
- 只讨论教育性的网络安全内容
- 强调道德黑客和负责任的漏洞披露
- 不提供恶意攻击指导
- 鼓励学生遵守法律法规
- 用简洁易懂的中文回答`,

  code_analysis: `你是专业的安全代码分析师。请分析提供的代码，识别潜在的安全漏洞，并提供：
1. 漏洞类型和风险等级
2. 攻击场景说明
3. 修复建议和安全代码示例
4. 相关的安全最佳实践

请用中文回答，内容要专业且易于理解。`,

  learning_path: `你是网络安全学习规划师。根据学生的当前水平和兴趣，提供个性化的学习路径建议：
1. 评估当前技能水平
2. 推荐学习顺序和重点
3. 建议实践项目
4. 推荐学习资源
5. 制定学习时间规划

请用中文回答，要考虑学习者的背景和目标。`,

  vulnerability_explanation: `你是漏洞原理解释专家。请详细解释指定的安全漏洞：
1. 漏洞的技术原理
2. 常见的利用方式（仅用于教育）
3. 防护和检测方法
4. 真实案例分析
5. 相关的安全标准

重点强调防护措施，避免提供具体的攻击代码。用中文回答。`
};

// 调用DeepSeek API
async function callDeepSeekAPI(messages, options = {}) {
  const {
    model = 'deepseek-chat',
    temperature = 0.7,
    maxTokens = 1500
  } = options;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API错误: ${errorData.error?.message || '未知错误'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    throw error;
  }
}

// 获取用户对话历史
function getConversationHistory(userId, context = 'general') {
  const key = `${userId}_${context}`;
  if (!conversationHistory.has(key)) {
    conversationHistory.set(key, []);
  }
  return conversationHistory.get(key);
}

// 保存对话历史
function saveConversationHistory(userId, context, message) {
  const key = `${userId}_${context}`;
  const history = getConversationHistory(userId, context);
  history.push(message);
  
  // 限制历史记录长度（保留最近10轮对话）
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
}

// 通用AI聊天接口
router.post('/chat', auth, aiLimiter, async (req, res) => {
  try {
    const { 
      message, 
      context = 'general',
      courseId = null,
      clearHistory = false
    } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '请输入您的问题'
      });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI服务暂时不可用'
      });
    }

    // 清空对话历史
    if (clearHistory) {
      conversationHistory.delete(`${req.userId}_${context}`);
    }

    // 构建消息历史
    const history = getConversationHistory(req.userId, context);
    const systemPrompt = SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.general;
    
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // 添加对话历史
    messages.push(...history);

    // 添加当前课程上下文
    let contextInfo = '';
    if (courseId) {
      contextInfo = `当前学习课程: ${courseId}\n`;
    }

    // 添加用户当前消息
    messages.push({
      role: 'user',
      content: contextInfo + message
    });

    // 调用AI API
    const aiResponse = await callDeepSeekAPI(messages);

    // 保存对话历史
    saveConversationHistory(req.userId, context, { role: 'user', content: message });
    saveConversationHistory(req.userId, context, { role: 'assistant', content: aiResponse });

    // 给用户增加AI使用积分
    const user = await User.findById(req.userId);
    await user.addPoints(2, 'ai_interaction');

    res.json({
      success: true,
      data: {
        response: aiResponse,
        context,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('AI聊天错误:', error);
    
    if (error.message.includes('API错误')) {
      res.status(503).json({
        success: false,
        message: 'AI服务暂时不可用，请稍后重试'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '处理请求失败'
      });
    }
  }
});

// 代码安全分析
router.post('/analyze-code', auth, aiLimiter, async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要分析的代码'
      });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI服务暂时不可用'
      });
    }

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS.code_analysis
      },
      {
        role: 'user',
        content: `请分析以下${language}代码的安全性：\n\n\`\`\`${language}\n${code}\n\`\`\``
      }
    ];

    const analysis = await callDeepSeekAPI(messages, { temperature: 0.3 });

    // 增加用户积分
    const user = await User.findById(req.userId);
    await user.addPoints(5, 'code_analysis');

    res.json({
      success: true,
      data: {
        analysis,
        language,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('代码分析错误:', error);
    res.status(500).json({
      success: false,
      message: '代码分析失败'
    });
  }
});

// 个性化学习建议
router.post('/learning-advice', auth, async (req, res) => {
  try {
    const { currentLevel, interests, goals, timeAvailable } = req.body;

    if (!DEEPSEEK_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI服务暂时不可用'
      });
    }

    const user = await User.findById(req.userId);
    const userInfo = `
用户资料：
- 用户名: ${user.username}
- 当前等级: ${user.progress.level}
- 总积分: ${user.progress.totalPoints}
- 已完成课程: ${user.progress.completedCourses.length}个
- 连续学习天数: ${user.progress.streakDays}天
- 当前水平: ${currentLevel || '初学者'}
- 兴趣方向: ${interests || '综合学习'}
- 学习目标: ${goals || '提升网络安全技能'}
- 可用时间: ${timeAvailable || '每天1-2小时'}
    `;

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS.learning_path
      },
      {
        role: 'user',
        content: `请为以下用户制定个性化的网络安全学习建议：\n${userInfo}`
      }
    ];

    const advice = await callDeepSeekAPI(messages, { temperature: 0.6 });

    // 增加用户积分
    await user.addPoints(3, 'learning_advice');

    res.json({
      success: true,
      data: {
        advice,
        userLevel: user.progress.level,
        totalPoints: user.progress.totalPoints,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('学习建议错误:', error);
    res.status(500).json({
      success: false,
      message: '获取学习建议失败'
    });
  }
});

// 漏洞解释
router.post('/explain-vulnerability', auth, aiLimiter, async (req, res) => {
  try {
    const { vulnerability, context = '' } = req.body;

    if (!vulnerability || vulnerability.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '请指定要解释的漏洞类型'
      });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI服务暂时不可用'
      });
    }

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS.vulnerability_explanation
      },
      {
        role: 'user',
        content: `请详细解释"${vulnerability}"这个安全漏洞。${context ? '\n上下文：' + context : ''}`
      }
    ];

    const explanation = await callDeepSeekAPI(messages, { temperature: 0.4 });

    // 增加用户积分
    const user = await User.findById(req.userId);
    await user.addPoints(4, 'vulnerability_learning');

    res.json({
      success: true,
      data: {
        explanation,
        vulnerability,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('漏洞解释错误:', error);
    res.status(500).json({
      success: false,
      message: '获取漏洞解释失败'
    });
  }
});

// 清空对话历史
router.delete('/conversation/:context', auth, async (req, res) => {
  try {
    const { context } = req.params;
    const key = `${req.userId}_${context}`;
    
    if (conversationHistory.has(key)) {
      conversationHistory.delete(key);
    }

    res.json({
      success: true,
      message: '对话历史已清空'
    });

  } catch (error) {
    console.error('清空对话历史错误:', error);
    res.status(500).json({
      success: false,
      message: '清空对话历史失败'
    });
  }
});

// 获取AI使用统计
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const conversationCount = Array.from(conversationHistory.keys())
      .filter(key => key.startsWith(req.userId))
      .reduce((total, key) => total + conversationHistory.get(key).length, 0);

    res.json({
      success: true,
      data: {
        conversationCount: Math.floor(conversationCount / 2), // 除以2因为包含用户和助手消息
        totalAIPoints: user.progress.badges
          .filter(badge => badge.badgeId.includes('ai'))
          .length * 10,
        availableContexts: Object.keys(SYSTEM_PROMPTS),
        currentLevel: user.progress.level,
        totalPoints: user.progress.totalPoints
      }
    });

  } catch (error) {
    console.error('获取AI统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

// 智能题目生成（额外功能）
router.post('/generate-quiz', auth, aiLimiter, async (req, res) => {
  try {
    const { topic, difficulty = 'medium', questionCount = 5 } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: '请指定题目主题'
      });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI服务暂时不可用'
      });
    }

    const messages = [
      {
        role: 'system',
        content: `你是专业的网络安全考试出题专家。请根据指定主题生成选择题，格式要求：
1. 每题包含题目、4个选项(A/B/C/D)、正确答案、解释
2. 题目要有实际应用价值
3. 难度要符合要求
4. 用JSON格式返回
5. 解释要详细且有教育意义`
      },
      {
        role: 'user',
        content: `请生成${questionCount}道关于"${topic}"的${difficulty}难度网络安全选择题。`
      }
    ];

    const quiz = await callDeepSeekAPI(messages, { temperature: 0.8, maxTokens: 2000 });

    // 增加用户积分
    const user = await User.findById(req.userId);
    await user.addPoints(8, 'quiz_generation');

    res.json({
      success: true,
      data: {
        quiz,
        topic,
        difficulty,
        questionCount,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('生成题目错误:', error);
    res.status(500).json({
      success: false,
      message: '生成题目失败'
    });
  }
});

module.exports = router;