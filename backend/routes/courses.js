const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

// 课程数据（实际部署时可以使用数据库）
const courseData = {
  'password-cracking': {
    id: 'password-cracking',
    title: 'Password Cracking Lab',
    description: '学习密码破解技术和防护方法',
    category: 'penetration-testing',
    difficulty: 'intermediate',
    estimatedTime: '45分钟',
    exercises: ['dictionary-attack', 'brute-force', 'hybrid-attack'],
    prerequisites: ['basic-security']
  },
  'network-scanning': {
    id: 'network-scanning',
    title: 'Network Scanning',
    description: '网络扫描和主机发现技术',
    category: 'reconnaissance',
    difficulty: 'beginner',
    estimatedTime: '30分钟',
    exercises: ['host-discovery', 'port-scanning', 'service-detection'],
    prerequisites: []
  },
  'cryptography': {
    id: 'cryptography',
    title: 'Cryptography Challenge',
    description: '密码学基础和经典加密算法',
    category: 'cryptography',
    difficulty: 'intermediate',
    estimatedTime: '60分钟',
    exercises: ['caesar-cipher', 'vigenere-cipher', 'frequency-analysis'],
    prerequisites: ['basic-mathematics']
  },
  'sql-injection': {
    id: 'sql-injection',
    title: 'SQL Injection Lab',
    description: 'SQL注入漏洞原理和防护',
    category: 'web-security',
    difficulty: 'intermediate',
    estimatedTime: '40分钟',
    exercises: ['union-based', 'boolean-based', 'time-based'],
    prerequisites: ['web-basics', 'database-basics']
  },
  'blue-team-siem': {
    id: 'blue-team-siem',
    title: 'Blue Team & SIEM',
    description: '蓝队防御和SIEM日志分析',
    category: 'defense',
    difficulty: 'advanced',
    estimatedTime: '90分钟',
    exercises: ['log-analysis', 'incident-response', 'threat-hunting'],
    prerequisites: ['network-security', 'system-administration']
  },
  'threat-modeling': {
    id: 'threat-modeling',
    title: 'Threat Modeling',
    description: '威胁建模方法和实践',
    category: 'security-architecture',
    difficulty: 'advanced',
    estimatedTime: '75分钟',
    exercises: ['stride-analysis', 'attack-trees', 'risk-assessment'],
    prerequisites: ['security-fundamentals']
  },
  'mobile-security': {
    id: 'mobile-security',
    title: 'Mobile Security',
    description: '移动应用安全分析',
    category: 'mobile',
    difficulty: 'advanced',
    estimatedTime: '80分钟',
    exercises: ['android-analysis', 'ios-security', 'mobile-malware'],
    prerequisites: ['mobile-development']
  }
};

// 获取所有课程列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;
    
    let courses = Object.values(courseData);
    
    // 按分类筛选
    if (category && category !== 'all') {
      courses = courses.filter(course => course.category === category);
    }
    
    // 按难度筛选
    if (difficulty && difficulty !== 'all') {
      courses = courses.filter(course => course.difficulty === difficulty);
    }
    
    // 搜索筛选
    if (search) {
      const searchLower = search.toLowerCase();
      courses = courses.filter(course => 
        course.title.toLowerCase().includes(searchLower) ||
        course.description.toLowerCase().includes(searchLower)
      );
    }
    
    // 如果用户已登录，添加进度信息
    if (req.userId) {
      const User = require('../models/User');
      const user = await User.findById(req.userId);
      
      courses = courses.map(course => {
        const completed = user.progress.completedCourses.find(
          c => c.courseId === course.id
        );
        const isCurrent = user.progress.currentCourse && 
          user.progress.currentCourse.courseId === course.id;
        
        return {
          ...course,
          isCompleted: !!completed,
          isCurrent,
          completedAt: completed?.completedAt || null,
          score: completed?.score || null,
          progress: isCurrent ? user.progress.currentCourse.progress : 0
        };
      });
    }
    
    res.json({
      success: true,
      data: {
        courses,
        categories: [
          { id: 'all', name: '全部分类' },
          { id: 'penetration-testing', name: '渗透测试' },
          { id: 'web-security', name: 'Web安全' },
          { id: 'cryptography', name: '密码学' },
          { id: 'reconnaissance', name: '信息收集' },
          { id: 'defense', name: '防御技术' },
          { id: 'security-architecture', name: '安全架构' },
          { id: 'mobile', name: '移动安全' }
        ],
        difficulties: [
          { id: 'all', name: '全部难度' },
          { id: 'beginner', name: '初级' },
          { id: 'intermediate', name: '中级' },
          { id: 'advanced', name: '高级' }
        ]
      }
    });
    
  } catch (error) {
    console.error('获取课程列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取课程列表失败'
    });
  }
});

// 获取单个课程详情
router.get('/:courseId', optionalAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const course = courseData[courseId];
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    let courseDetail = { ...course };
    
    // 如果用户已登录，添加个人进度
    if (req.userId) {
      const User = require('../models/User');
      const user = await User.findById(req.userId);
      
      const completed = user.progress.completedCourses.find(
        c => c.courseId === courseId
      );
      const isCurrent = user.progress.currentCourse && 
        user.progress.currentCourse.courseId === courseId;
      
      courseDetail = {
        ...courseDetail,
        isCompleted: !!completed,
        isCurrent,
        completedAt: completed?.completedAt || null,
        score: completed?.score || null,
        progress: isCurrent ? user.progress.currentCourse.progress : 0,
        canStart: true // 可以根据前置条件判断
      };
      
      // 获取练习完成情况
      courseDetail.exerciseProgress = course.exercises.map(exerciseId => {
        const exerciseCompleted = user.progress.completedExercises.find(
          e => e.exerciseId === exerciseId
        );
        return {
          id: exerciseId,
          isCompleted: !!exerciseCompleted,
          attempts: exerciseCompleted?.attempts || 0,
          bestScore: exerciseCompleted?.bestScore || 0,
          completedAt: exerciseCompleted?.completedAt || null
        };
      });
    }
    
    res.json({
      success: true,
      data: { course: courseDetail }
    });
    
  } catch (error) {
    console.error('获取课程详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取课程详情失败'
    });
  }
});

// 获取课程统计信息
router.get('/:courseId/stats', optionalAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    if (!courseData[courseId]) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    const User = require('../models/User');
    const Comment = require('../models/Comment');
    
    // 获取课程完成人数
    const completedCount = await User.countDocuments({
      'progress.completedCourses.courseId': courseId
    });
    
    // 获取正在学习人数
    const currentlyLearning = await User.countDocuments({
      'progress.currentCourse.courseId': courseId
    });
    
    // 获取评论统计
    const commentStats = await Comment.getCommentStats(courseId);
    
    // 获取平均完成时间（模拟数据）
    const avgCompletionTime = Math.floor(Math.random() * 60) + 30; // 30-90分钟
    
    res.json({
      success: true,
      data: {
        completedCount,
        currentlyLearning,
        totalLearners: completedCount + currentlyLearning,
        averageRating: commentStats[0]?.averageRating || 0,
        totalComments: commentStats[0]?.totalComments || 0,
        averageCompletionTime: avgCompletionTime,
        ratingDistribution: commentStats[0]?.ratingDistribution || []
      }
    });
    
  } catch (error) {
    console.error('获取课程统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取课程统计失败'
    });
  }
});

// 获取推荐课程
router.get('/recommendations/for-user', optionalAuth, async (req, res) => {
  try {
    if (!req.userId) {
      // 未登录用户返回热门课程
      const popularCourses = ['network-scanning', 'cryptography', 'password-cracking'];
      const courses = popularCourses.map(id => courseData[id]);
      
      return res.json({
        success: true,
        data: {
          courses,
          reason: '热门课程推荐'
        }
      });
    }
    
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    
    // 根据用户等级和完成课程推荐
    const completedCourseIds = user.progress.completedCourses.map(c => c.courseId);
    let recommendedCourses = [];
    
    if (user.progress.level <= 2) {
      // 初学者推荐
      recommendedCourses = ['network-scanning', 'cryptography'];
    } else if (user.progress.level <= 4) {
      // 中级推荐
      recommendedCourses = ['password-cracking', 'sql-injection'];
    } else {
      // 高级推荐
      recommendedCourses = ['blue-team-siem', 'threat-modeling', 'mobile-security'];
    }
    
    // 过滤已完成的课程
    recommendedCourses = recommendedCourses.filter(id => !completedCourseIds.includes(id));
    
    // 如果推荐课程不够，随机添加其他课程
    if (recommendedCourses.length < 3) {
      const allCourseIds = Object.keys(courseData);
      const remaining = allCourseIds.filter(id => 
        !completedCourseIds.includes(id) && !recommendedCourses.includes(id)
      );
      recommendedCourses = [...recommendedCourses, ...remaining.slice(0, 3 - recommendedCourses.length)];
    }
    
    const courses = recommendedCourses.map(id => courseData[id]).filter(Boolean);
    
    res.json({
      success: true,
      data: {
        courses,
        reason: `基于您的等级 ${user.progress.level} 的个性化推荐`
      }
    });
    
  } catch (error) {
    console.error('获取推荐课程错误:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐课程失败'
    });
  }
});

// 获取学习路径
router.get('/learning-paths/all', async (req, res) => {
  try {
    const learningPaths = [
      {
        id: 'beginner-path',
        name: '网络安全入门路径',
        description: '适合零基础学员的完整学习路径',
        estimatedTime: '3-4周',
        difficulty: 'beginner',
        courses: [
          {
            ...courseData['network-scanning'],
            order: 1,
            isPrerequisite: false
          },
          {
            ...courseData['cryptography'],
            order: 2,
            isPrerequisite: false
          },
          {
            ...courseData['password-cracking'],
            order: 3,
            isPrerequisite: true
          },
          {
            ...courseData['sql-injection'],
            order: 4,
            isPrerequisite: true
          }
        ]
      },
      {
        id: 'pentesting-path',
        name: '渗透测试专业路径',
        description: '深入学习渗透测试技术',
        estimatedTime: '6-8周',
        difficulty: 'intermediate',
        courses: [
          {
            ...courseData['network-scanning'],
            order: 1,
            isPrerequisite: false
          },
          {
            ...courseData['password-cracking'],
            order: 2,
            isPrerequisite: true
          },
          {
            ...courseData['sql-injection'],
            order: 3,
            isPrerequisite: true
          },
          {
            ...courseData['mobile-security'],
            order: 4,
            isPrerequisite: true
          }
        ]
      },
      {
        id: 'defense-path',
        name: '防御技术专家路径',
        description: '专注于防御和蓝队技术',
        estimatedTime: '8-10周',
        difficulty: 'advanced',
        courses: [
          {
            ...courseData['network-scanning'],
            order: 1,
            isPrerequisite: false
          },
          {
            ...courseData['threat-modeling'],
            order: 2,
            isPrerequisite: true
          },
          {
            ...courseData['blue-team-siem'],
            order: 3,
            isPrerequisite: true
          }
        ]
      }
    ];
    
    res.json({
      success: true,
      data: { learningPaths }
    });
    
  } catch (error) {
    console.error('获取学习路径错误:', error);
    res.status(500).json({
      success: false,
      message: '获取学习路径失败'
    });
  }
});

// 获取课程内容（实际的课程页面内容）
router.get('/:courseId/content', optionalAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    if (!courseData[courseId]) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    // 这里返回课程对应的HTML文件路径
    const contentMapping = {
      'password-cracking': '/pages/exercises/password-cracking.html',
      'network-scanning': '/pages/exercises/network-scanning.html',
      'cryptography': '/pages/exercises/cryptography.html',
      'sql-injection': '/pages/exercises/sql-injection.html',
      'blue-team-siem': '/pages/courses/blue-team-siem.html',
      'threat-modeling': '/pages/courses/threat-modeling.html',
      'mobile-security': '/pages/courses/mobile-security.html'
    };
    
    res.json({
      success: true,
      data: {
        contentUrl: contentMapping[courseId] || '/pages/courses/coming-soon.html',
        courseId,
        title: courseData[courseId].title
      }
    });
    
  } catch (error) {
    console.error('获取课程内容错误:', error);
    res.status(500).json({
      success: false,
      message: '获取课程内容失败'
    });
  }
});

module.exports = router;