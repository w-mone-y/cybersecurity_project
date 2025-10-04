const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必填项'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [30, '用户名最多30个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必填项'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码至少6个字符']
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // 学习进度
  progress: {
    completedCourses: [{
      courseId: String,
      completedAt: Date,
      score: Number
    }],
    currentCourse: {
      courseId: String,
      progress: Number, // 0-100
      lastAccessedAt: Date
    },
    completedExercises: [{
      exerciseId: String,
      completedAt: Date,
      attempts: Number,
      bestScore: Number
    }],
    totalPoints: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    badges: [{
      badgeId: String,
      name: String,
      earnedAt: Date,
      description: String
    }],
    streakDays: {
      type: Number,
      default: 0
    },
    lastActiveDate: Date
  },
  
  // 用户偏好
  preferences: {
    language: {
      type: String,
      enum: ['zh', 'en'],
      default: 'zh'
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true }
    }
  },
  
  // 统计信息
  stats: {
    loginCount: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 }, // 分钟
    commentsCount: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      return ret;
    }
  }
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'progress.totalPoints': -1 });

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码比较方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 获取用户等级
userSchema.methods.getLevel = function() {
  const points = this.progress.totalPoints;
  if (points < 100) return 1;
  if (points < 500) return 2;
  if (points < 1500) return 3;
  if (points < 3000) return 4;
  if (points < 5000) return 5;
  return Math.floor(points / 1000) + 5;
};

// 添加积分
userSchema.methods.addPoints = function(points, reason) {
  this.progress.totalPoints += points;
  this.progress.level = this.getLevel();
  
  // 检查是否获得新徽章
  this.checkForNewBadges(reason);
  
  return this.save();
};

// 检查新徽章
userSchema.methods.checkForNewBadges = function(reason) {
  const badges = [];
  const points = this.progress.totalPoints;
  
  // 积分徽章
  if (points >= 100 && !this.hasBadge('first-100')) {
    badges.push({
      badgeId: 'first-100',
      name: '初学者',
      description: '获得第一个100积分',
      earnedAt: new Date()
    });
  }
  
  if (points >= 1000 && !this.hasBadge('scholar-1k')) {
    badges.push({
      badgeId: 'scholar-1k',
      name: '学者',
      description: '获得1000积分',
      earnedAt: new Date()
    });
  }
  
  // 完成课程徽章
  if (this.progress.completedCourses.length >= 1 && !this.hasBadge('first-course')) {
    badges.push({
      badgeId: 'first-course',
      name: '课程完成者',
      description: '完成第一个课程',
      earnedAt: new Date()
    });
  }
  
  if (badges.length > 0) {
    this.progress.badges.push(...badges);
  }
};

// 检查是否有徽章
userSchema.methods.hasBadge = function(badgeId) {
  return this.progress.badges.some(badge => badge.badgeId === badgeId);
};

// 更新连续学习天数
userSchema.methods.updateStreak = function() {
  const today = new Date().toDateString();
  const lastActive = this.progress.lastActiveDate ? 
    this.progress.lastActiveDate.toDateString() : null;
  
  if (lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActive === yesterday.toDateString()) {
      this.progress.streakDays += 1;
    } else {
      this.progress.streakDays = 1;
    }
    
    this.progress.lastActiveDate = new Date();
  }
};

module.exports = mongoose.model('User', userSchema);