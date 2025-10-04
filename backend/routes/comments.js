const express = require('express');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { auth, optionalAuth, authorize } = require('../middleware/auth');
const router = express.Router();

// 获取课程评论列表
router.get('/course/:courseId', optionalAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder),
      onlyTopLevel: true,
      currentUserId: req.userId
    };
    
    const comments = await Comment.getCourseComments(courseId, options);
    const stats = await Comment.getCommentStats(courseId);
    
    res.json({
      success: true,
      data: {
        comments,
        stats: stats[0] || {
          totalComments: 0,
          averageRating: 0,
          totalLikes: 0,
          ratingDistribution: []
        },
        pagination: {
          page: options.page,
          limit: options.limit,
          hasMore: comments.length === options.limit
        }
      }
    });
    
  } catch (error) {
    console.error('获取评论列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败'
    });
  }
});

// 获取单个评论详情（包含回复）
router.get('/:commentId', optionalAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findOne({
      _id: commentId,
      isApproved: true,
      isDeleted: false
    })
      .populate('author', 'username avatar role')
      .populate({
        path: 'replies',
        match: { isApproved: true, isDeleted: false },
        populate: {
          path: 'author',
          select: 'username avatar role'
        },
        options: { sort: { createdAt: 1 } }
      });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }
    
    // 添加当前用户点赞状态
    if (req.userId) {
      comment._currentUserId = req.userId;
    }
    
    res.json({
      success: true,
      data: { comment }
    });
    
  } catch (error) {
    console.error('获取评论详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取评论详情失败'
    });
  }
});

// 发表评论
router.post('/', auth, async (req, res) => {
  try {
    const {
      courseId,
      content,
      rating,
      parentId = null,
      category = 'general'
    } = req.body;
    
    if (!courseId || !content) {
      return res.status(400).json({
        success: false,
        message: '课程ID和评论内容是必填项'
      });
    }
    
    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空'
      });
    }
    
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1-5之间'
      });
    }
    
    let replyLevel = 0;
    let parentComment = null;
    
    // 如果是回复，检查父评论
    if (parentId) {
      parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: '父评论不存在'
        });
      }
      
      replyLevel = parentComment.replyLevel + 1;
      
      // 限制回复层级
      if (replyLevel > 3) {
        return res.status(400).json({
          success: false,
          message: '回复层级过深，最多支持3层回复'
        });
      }
    }
    
    // 创建新评论
    const comment = new Comment({
      courseId,
      author: req.userId,
      content: content.trim(),
      rating: rating || null,
      parentId,
      replyLevel,
      category
    });
    
    await comment.save();
    
    // 如果是回复，更新父评论的replies数组
    if (parentComment) {
      await parentComment.addReply(comment._id);
    }
    
    // 更新用户评论统计
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.commentsCount': 1 }
    });
    
    // 给用户增加积分
    const user = await User.findById(req.userId);
    await user.addPoints(parentId ? 5 : 10, parentId ? 'comment_reply' : 'comment_post');
    
    // 填充作者信息后返回
    await comment.populate('author', 'username avatar role');
    
    res.status(201).json({
      success: true,
      message: parentId ? '回复发表成功！' : '评论发表成功！',
      data: { comment }
    });
    
  } catch (error) {
    console.error('发表评论错误:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }
    
    res.status(500).json({
      success: false,
      message: '发表评论失败'
    });
  }
});

// 编辑评论
router.put('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空'
      });
    }
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }
    
    // 检查权限
    if (comment.author.toString() !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '您只能编辑自己的评论'
      });
    }
    
    // 检查评论创建时间，限制编辑时间窗口（24小时）
    const timeLimit = 24 * 60 * 60 * 1000; // 24小时
    if (Date.now() - comment.createdAt.getTime() > timeLimit && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '评论发布超过24小时后不能编辑'
      });
    }
    
    await comment.editContent(content.trim());
    await comment.populate('author', 'username avatar role');
    
    res.json({
      success: true,
      message: '评论编辑成功',
      data: { comment }
    });
    
  } catch (error) {
    console.error('编辑评论错误:', error);
    res.status(500).json({
      success: false,
      message: '编辑评论失败'
    });
  }
});

// 删除评论
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }
    
    // 检查权限
    if (comment.author.toString() !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '您只能删除自己的评论'
      });
    }
    
    // 软删除评论
    await Comment.findByIdAndUpdate(commentId, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.userId
      }
    });
    
    // 更新用户评论统计
    await User.findByIdAndUpdate(comment.author, {
      $inc: { 'stats.commentsCount': -1 }
    });
    
    res.json({
      success: true,
      message: '评论删除成功'
    });
    
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败'
    });
  }
});

// 点赞/取消点赞评论
router.post('/:commentId/like', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findOne({
      _id: commentId,
      isApproved: true,
      isDeleted: false
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }
    
    // 不能给自己的评论点赞
    if (comment.author.toString() === req.userId) {
      return res.status(400).json({
        success: false,
        message: '不能给自己的评论点赞'
      });
    }
    
    const wasLiked = comment.likes.some(like => 
      like.user.toString() === req.userId
    );
    
    await comment.toggleLike(req.userId);
    
    // 如果是新点赞，给评论作者增加点赞统计
    if (!wasLiked) {
      await User.findByIdAndUpdate(comment.author, {
        $inc: { 'stats.likesReceived': 1 }
      });
    } else {
      await User.findByIdAndUpdate(comment.author, {
        $inc: { 'stats.likesReceived': -1 }
      });
    }
    
    res.json({
      success: true,
      message: wasLiked ? '取消点赞成功' : '点赞成功',
      data: {
        isLiked: !wasLiked,
        likesCount: comment.likesCount
      }
    });
    
  } catch (error) {
    console.error('点赞评论错误:', error);
    res.status(500).json({
      success: false,
      message: '点赞操作失败'
    });
  }
});

// 举报评论
router.post('/:commentId/report', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: '举报理由是必填项'
      });
    }
    
    const validReasons = ['spam', 'inappropriate', 'offensive', 'copyright', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: '无效的举报理由'
      });
    }
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }
    
    // 不能举报自己的评论
    if (comment.author.toString() === req.userId) {
      return res.status(400).json({
        success: false,
        message: '不能举报自己的评论'
      });
    }
    
    try {
      await comment.addReport(req.userId, reason, description);
      
      res.json({
        success: true,
        message: '举报提交成功，我们将尽快处理'
      });
      
    } catch (reportError) {
      if (reportError.message === '您已经举报过这条评论') {
        return res.status(400).json({
          success: false,
          message: reportError.message
        });
      }
      throw reportError;
    }
    
  } catch (error) {
    console.error('举报评论错误:', error);
    res.status(500).json({
      success: false,
      message: '举报提交失败'
    });
  }
});

// 获取用户评论历史
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder)
    };
    
    const comments = await Comment.getUserComments(userId, options);
    
    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: options.page,
          limit: options.limit,
          hasMore: comments.length === options.limit
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户评论历史错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户评论历史失败'
    });
  }
});

// 管理员审核评论
router.put('/:commentId/moderate', auth, authorize(['admin']), async (req, res) => {
  try {
    const { commentId } = req.params;
    const { action, reason } = req.body; // action: 'approve' | 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的审核操作'
      });
    }
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }
    
    comment.isApproved = action === 'approve';
    comment.moderationReason = reason || '';
    comment.moderatedBy = req.userId;
    comment.moderatedAt = new Date();
    
    await comment.save();
    
    res.json({
      success: true,
      message: action === 'approve' ? '评论已批准' : '评论已拒绝',
      data: { comment }
    });
    
  } catch (error) {
    console.error('审核评论错误:', error);
    res.status(500).json({
      success: false,
      message: '审核评论失败'
    });
  }
});

// 获取待审核评论列表（管理员）
router.get('/admin/pending', auth, authorize(['admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;
    
    const comments = await Comment.find({
      $or: [
        { isApproved: false },
        { 'reports.0': { $exists: true } }
      ],
      isDeleted: false
    })
      .populate('author', 'username avatar role')
      .sort({ [sortBy]: parseInt(sortOrder) })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Comment.countDocuments({
      $or: [
        { isApproved: false },
        { 'reports.0': { $exists: true } }
      ],
      isDeleted: false
    });
    
    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取待审核评论错误:', error);
    res.status(500).json({
      success: false,
      message: '获取待审核评论失败'
    });
  }
});

module.exports = router;