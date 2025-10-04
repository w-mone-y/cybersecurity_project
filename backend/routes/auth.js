const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// 邮件服务（实际部署时需要配置）
const sendEmail = async (to, subject, html) => {
  console.log('发送邮件到:', to, '主题:', subject);
  // TODO: 集成真实的邮件服务 (如 SendGrid, 阿里云邮件推送)
  return true;
};

// 注册限制
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 3, // 每个IP最多3次注册尝试
  message: { message: '注册请求过于频繁，请15分钟后再试' }
});

// 登录限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP最多5次登录尝试
  message: { message: '登录尝试过于频繁，请15分钟后再试' }
});

// JWT密钥（生产环境中应该使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

// 用户注册
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password, language = 'zh' } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码都是必填项'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6个字符'
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? '邮箱已被注册' : '用户名已被使用'
      });
    }
    
    // 生成邮箱验证令牌
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    
    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      emailVerificationToken,
      preferences: { language }
    });
    
    await user.save();
    
    // 发送验证邮件
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
    const emailHtml = `
      <h2>欢迎来到 CyberSec Academy！</h2>
      <p>感谢您注册我们的网络安全学习平台。请点击下面的链接验证您的邮箱：</p>
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #00f5ff, #0099ff); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">验证邮箱</a>
      <p>如果您没有注册账户，请忽略此邮件。</p>
      <p>祝您学习愉快！<br>CyberSec Academy 团队</p>
    `;
    
    await sendEmail(email, '验证您的 CyberSec Academy 账户', emailHtml);
    
    // 生成JWT令牌
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: '注册成功！请检查您的邮箱以验证账户',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          progress: user.progress,
          preferences: user.preferences
        }
      }
    });
    
  } catch (error) {
    console.error('注册错误:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }
    
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
});

// 用户登录
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码都是必填项'
      });
    }
    
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }
    
    // 更新登录统计
    user.stats.loginCount += 1;
    user.updateStreak();
    await user.save();
    
    // 生成JWT令牌
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          progress: user.progress,
          preferences: user.preferences,
          stats: user.stats
        }
      }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

// 邮箱验证
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '验证令牌是必需的'
      });
    }
    
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效的验证令牌'
      });
    }
    
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    
    // 给予邮箱验证奖励积分
    await user.addPoints(50, 'email_verification');
    
    res.json({
      success: true,
      message: '邮箱验证成功！获得50积分奖励'
    });
    
  } catch (error) {
    console.error('邮箱验证错误:', error);
    res.status(500).json({
      success: false,
      message: '邮箱验证失败'
    });
  }
});

// 忘记密码
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱是必填项'
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      // 出于安全考虑，不暴露用户是否存在
      return res.json({
        success: true,
        message: '如果邮箱存在，您将收到密码重置链接'
      });
    }
    
    // 生成密码重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1小时后过期
    await user.save();
    
    // 发送密码重置邮件
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailHtml = `
      <h2>密码重置请求</h2>
      <p>您请求重置 CyberSec Academy 账户的密码。点击下面的链接设置新密码：</p>
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #ff4757, #ff3838); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">重置密码</a>
      <p>此链接将在1小时后失效。</p>
      <p>如果您没有请求重置密码，请忽略此邮件。</p>
    `;
    
    await sendEmail(email, '密码重置 - CyberSec Academy', emailHtml);
    
    res.json({
      success: true,
      message: '如果邮箱存在，您将收到密码重置链接'
    });
    
  } catch (error) {
    console.error('忘记密码错误:', error);
    res.status(500).json({
      success: false,
      message: '请求处理失败'
    });
  }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: '令牌和新密码都是必填项'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6个字符'
      });
    }
    
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '令牌无效或已过期'
      });
    }
    
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    });
    
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      success: false,
      message: '密码重置失败'
    });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          progress: user.progress,
          preferences: user.preferences,
          stats: user.stats,
          createdAt: user.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 更新用户信息
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar, preferences } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查用户名是否被占用
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已被使用'
        });
      }
      user.username = username;
    }
    
    if (avatar) user.avatar = avatar;
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: '个人信息更新成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          preferences: user.preferences
        }
      }
    });
    
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    });
  }
});

// 修改密码
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新密码都是必填项'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少6个字符'
      });
    }
    
    const user = await User.findById(req.userId);
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
    
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '密码修改失败'
    });
  }
});

// 注销 (客户端删除令牌即可)
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: '注销成功'
  });
});

module.exports = router;