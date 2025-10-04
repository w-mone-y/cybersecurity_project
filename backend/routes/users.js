const express = require('express');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { auth, optionalAuth, authorize } = require('../middleware/auth');
const router = express.Router();

// 获取用户排行榜
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { 
      type = 'points', // points, level, streak, comments
      limit = 50,
      page = 1 
    } = req.query;

    let sortField = 'progress.totalPoints';
    switch (type) {
      case 'level':
        sortField = 'progress.level';
        break;
      case 'streak':
        sortField = 'progress.streakDays';
        break;
      case 'comments':
        sortField = 'stats.commentsCount';
        break;
      default:
        sortField = 'progress.totalPoints';
    }

    const users = await User.find()
      .select('username avatar role progress stats createdAt')
      .sort({ [sortField]: -1, createdAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // 添加排名
    const leaderboard = users.map((user, index) => ({
      rank: (parseInt(page) - 1) * parseInt(limit) + index + 1,
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      level: user.progress.level,
      totalPoints: user.progress.totalPoints,
      streakDays: user.progress.streakDays,
      commentsCount: user.stats.commentsCount,
      joinedAt: user.createdAt,
      badges: user.progress.badges.slice(0, 3) // 只显示前3个徽章
    }));

    // 如果用户已登录，添加当前用户排名
    let currentUserRank = null;
    if (req.userId) {
      const currentUser = await User.findById(req.userId);
      const usersBefore = await User.countDocuments({
        [sortField]: { $gt: currentUser[sortField.split('.').pop()] }
      });
      currentUserRank = usersBefore + 1;
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        currentUserRank,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: users.length === parseInt(limit)
        },
        type
      }
    });

  } catch (error) {
    console.error('获取排行榜错误:', error);
    res.status(500).json({
      success: false,
      message: '获取排行榜失败'
    });
  }
});

// 获取用户公开资料
router.get('/:userId/profile', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('username avatar role progress stats createdAt preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户最近的评论
    const recentComments = await Comment.find({
      author: userId,
      isApproved: true,
      isDeleted: false
    })
      .select('courseId content rating createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // 计算用户统计
    const totalComments = await Comment.countDocuments({
      author: userId,
      isDeleted: false
    });

    const totalLikes = await Comment.aggregate([
      { $match: { author: user._id } },
      { $group: { _id: null, totalLikes: { $sum: '$likesCount' } } }
    ]);

    const profile = {
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      level: user.progress.level,
      totalPoints: user.progress.totalPoints,
      badges: user.progress.badges,
      streakDays: user.progress.streakDays,
      completedCourses: user.progress.completedCourses.length,
      joinedAt: user.createdAt,
      stats: {
        ...user.stats,
        totalComments,
        totalLikes: totalLikes[0]?.totalLikes || 0
      },
      recentComments,
      preferences: {
        language: user.preferences.language,
        theme: user.preferences.theme
      }
    };

    // 检查是否是当前用户自己的资料
    const isOwnProfile = req.userId && req.userId === userId;

    res.json({
      success: true,
      data: {
        profile,
        isOwnProfile
      }
    });

  } catch (error) {
    console.error('获取用户资料错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户资料失败'
    });
  }
});

// 更新用户学习进度
router.post('/progress/update', auth, async (req, res) => {
  try {
    const {
      courseId,
      exerciseId,
      action, // 'course_complete', 'exercise_complete', 'course_start'
      score = null,
      timeSpent = 0
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    let pointsEarned = 0;
    let newBadges = [];

    switch (action) {
      case 'course_start':
        user.progress.currentCourse = {
          courseId,
          progress: 0,
          lastAccessedAt: new Date()
        };
        pointsEarned = 5;
        break;

      case 'course_complete':
        // 检查是否已完成过
        const alreadyCompleted = user.progress.completedCourses.find(
          course => course.courseId === courseId
        );
        
        if (!alreadyCompleted) {
          user.progress.completedCourses.push({
            courseId,
            completedAt: new Date(),
            score: score || 100
          });
          pointsEarned = 50;
        } else {
          pointsEarned = 10; // 重复完成奖励
        }

        // 清空当前课程
        if (user.progress.currentCourse && 
            user.progress.currentCourse.courseId === courseId) {
          user.progress.currentCourse = null;
        }
        break;

      case 'exercise_complete':
        const existingExercise = user.progress.completedExercises.find(
          ex => ex.exerciseId === exerciseId
        );

        if (existingExercise) {
          existingExercise.attempts += 1;
          if (score && score > existingExercise.bestScore) {
            existingExercise.bestScore = score;
            pointsEarned = 15;
          } else {
            pointsEarned = 5;
          }
        } else {
          user.progress.completedExercises.push({
            exerciseId,
            completedAt: new Date(),
            attempts: 1,
            bestScore: score || 0
          });
          pointsEarned = 25;
        }
        break;
    }

    // 更新学习时间
    user.stats.totalStudyTime += timeSpent;

    // 更新学习连续天数
    user.updateStreak();

    // 添加积分
    if (pointsEarned > 0) {
      await user.addPoints(pointsEarned, action);
    }

    await user.save();

    res.json({
      success: true,
      message: '学习进度更新成功',
      data: {
        pointsEarned,
        totalPoints: user.progress.totalPoints,
        level: user.progress.level,
        streakDays: user.progress.streakDays,
        newBadges: user.progress.badges.slice(-3) // 最新的3个徽章
      }
    });

  } catch (error) {
    console.error('更新学习进度错误:', error);
    res.status(500).json({
      success: false,
      message: '更新学习进度失败'
    });
  }
});

// 获取用户成就和徽章
router.get('/achievements', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // 定义所有可能的成就
    const allAchievements = [
      {
        id: 'first-100',
        name: '初学者',
        description: '获得第一个100积分',
        icon: '🎯',
        points: 100,
        category: 'points'
      },
      {
        id: 'scholar-1k',
        name: '学者',
        description: '获得1000积分',
        icon: '📚',
        points: 1000,
        category: 'points'
      },
      {
        id: 'first-course',
        name: '课程完成者',
        description: '完成第一个课程',
        icon: '🎓',
        points: 0,
        category: 'courses'
      },
      {
        id: 'streak-7',
        name: '坚持者',
        description: '连续学习7天',
        icon: '🔥',
        points: 0,
        category: 'habits'
      },
      {
        id: 'commenter',
        name: '积极参与者',
        description: '发表10条评论',
        icon: '💬',
        points: 0,
        category: 'social'
      }
    ];

    // 检查用户已获得的成就
    const userBadges = user.progress.badges.map(badge => badge.badgeId);
    const achievements = allAchievements.map(achievement => ({
      ...achievement,
      earned: userBadges.includes(achievement.id),
      earnedAt: user.progress.badges.find(b => b.badgeId === achievement.id)?.earnedAt || null
    }));

    res.json({
      success: true,
      data: {
        achievements,
        totalEarned: user.progress.badges.length,
        totalAvailable: allAchievements.length,
        progress: {
          level: user.progress.level,
          totalPoints: user.progress.totalPoints,
          streakDays: user.progress.streakDays,
          completedCourses: user.progress.completedCourses.length
        }
      }
    });

  } catch (error) {
    console.error('获取用户成就错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户成就失败'
    });
  }
});

// 获取学习统计
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // 计算这周的学习天数
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeekComments = await Comment.countDocuments({
      author: req.userId,
      createdAt: { $gte: oneWeekAgo }
    });

    // 计算等级进度
    const currentLevelPoints = user.progress.totalPoints;
    const nextLevelPoints = user.getLevel() === user.progress.level ? 
      Math.max(100, user.progress.level * 1000) : 
      (user.progress.level + 1) * 1000;
    
    const levelProgress = Math.min(100, 
      (currentLevelPoints / nextLevelPoints) * 100
    );

    res.json({
      success: true,
      data: {
        overview: {
          level: user.progress.level,
          totalPoints: user.progress.totalPoints,
          levelProgress,
          streakDays: user.progress.streakDays,
          totalStudyTime: Math.round(user.stats.totalStudyTime / 60), // 转为小时
        },
        achievements: {
          totalBadges: user.progress.badges.length,
          completedCourses: user.progress.completedCourses.length,
          completedExercises: user.progress.completedExercises.length,
        },
        activity: {
          totalComments: user.stats.commentsCount,
          thisWeekComments,
          likesReceived: user.stats.likesReceived,
          loginCount: user.stats.loginCount
        },
        recentActivity: {
          lastLogin: user.updatedAt,
          currentCourse: user.progress.currentCourse,
          recentBadges: user.progress.badges.slice(-3)
        }
      }
    });

  } catch (error) {
    console.error('获取学习统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取学习统计失败'
    });
  }
});

// 搜索用户
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词至少2个字符'
      });
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' }
    })
      .select('username avatar role progress.level progress.totalPoints')
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          level: user.progress.level,
          totalPoints: user.progress.totalPoints
        })),
        query: q
      }
    });

  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({
      success: false,
      message: '搜索用户失败'
    });
  }
});

// 管理员用户管理
router.get('/admin/list', auth, authorize(['admin']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt',
      sortOrder = -1,
      role = null,
      search = null
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ [sortBy]: parseInt(sortOrder) })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 管理员修改用户角色
router.put('/:userId/role', auth, authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['student', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户角色'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户角色更新成功',
      data: { user }
    });

  } catch (error) {
    console.error('修改用户角色错误:', error);
    res.status(500).json({
      success: false,
      message: '修改用户角色失败'
    });
  }
});

module.exports = router;