const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('../')); // 服务前端文件

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 每个IP最多100次请求
});
app.use('/api/', limiter);

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cybersec_academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 导入路由
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const commentRoutes = require('./routes/comments');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/users');

// 使用路由
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

// Socket.io 实时通信
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  // 加入课程房间
  socket.on('join-course', (courseId) => {
    socket.join(courseId);
  });
  
  // 新评论通知
  socket.on('new-comment', (data) => {
    socket.to(data.courseId).emit('comment-added', data);
  });
  
  // AI对话
  socket.on('ai-message', async (data) => {
    try {
      // 这里会调用DeepSeek API
      const response = await handleAIMessage(data);
      socket.emit('ai-response', response);
    } catch (error) {
      socket.emit('ai-error', { message: '抱歉，AI助手暂时不可用' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

// AI消息处理函数
async function handleAIMessage(data) {
  const { message, context, userId } = data;
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的网络安全教育助手，帮助学生理解网络安全概念、解答技术问题，并提供学习建议。请用中文回答。'
          },
          {
            role: 'user',
            content: `学习上下文：${context}\n问题：${message}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    const result = await response.json();
    return {
      message: result.choices[0].message.content,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('DeepSeek API错误:', error);
    throw error;
  }
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 CyberSec Academy 服务器运行在端口 ${PORT}`);
  console.log(`📱 Socket.io 服务器已启动`);
  console.log(`🤖 DeepSeek AI助手已集成`);
});