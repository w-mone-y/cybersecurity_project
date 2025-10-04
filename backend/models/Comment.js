const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: [true, '课程ID是必填项'],
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作者是必填项']
  },
  content: {
    type: String,
    required: [true, '评论内容是必填项'],
    minlength: [1, '评论内容不能为空'],
    maxlength: [2000, '评论内容不能超过2000字符'],
    trim: true
  },
  
  // 评分 (1-5星)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // 回复系统
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  replyLevel: {
    type: Number,
    default: 0,
    max: 3 // 最多3层回复
  },
  
  // 点赞系统
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  
  // 内容审核
  isApproved: {
    type: Boolean,
    default: true
  },
  moderationReason: String,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  
  // 举报系统
  reports: [{
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'offensive', 'copyright', 'other']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  
  // 编辑历史
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  lastEditedAt: Date,
  
  // 标签和分类
  tags: [String],
  category: {
    type: String,
    enum: ['general', 'question', 'tip', 'bug-report', 'suggestion'],
    default: 'general'
  },
  
  // 状态
  isPinned: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
commentSchema.index({ courseId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ isApproved: 1, isDeleted: 1 });
commentSchema.index({ likesCount: -1 });

// 虚拟字段 - 回复数量
commentSchema.virtual('repliesCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// 虚拟字段 - 是否被当前用户点赞
commentSchema.virtual('isLikedByUser').get(function() {
  if (!this._currentUserId) return false;
  return this.likes.some(like => like.user.toString() === this._currentUserId.toString());
});

// 实例方法 - 切换点赞
commentSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => 
    like.user.toString() === userId.toString()
  );
  
  if (existingLike) {
    // 取消点赞
    this.likes = this.likes.filter(like => 
      like.user.toString() !== userId.toString()
    );
    this.likesCount = Math.max(0, this.likesCount - 1);
  } else {
    // 添加点赞
    this.likes.push({ user: userId });
    this.likesCount += 1;
  }
  
  return this.save();
};

// 实例方法 - 添加回复
commentSchema.methods.addReply = function(replyId) {
  if (!this.replies.includes(replyId)) {
    this.replies.push(replyId);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法 - 举报评论
commentSchema.methods.addReport = function(reporterId, reason, description) {
  // 检查用户是否已经举报过
  const existingReport = this.reports.find(report => 
    report.reporter.toString() === reporterId.toString()
  );
  
  if (existingReport) {
    throw new Error('您已经举报过这条评论');
  }
  
  this.reports.push({
    reporter: reporterId,
    reason,
    description: description || ''
  });
  
  // 如果举报数量达到阈值，自动隐藏评论
  if (this.reports.length >= 3) {
    this.isApproved = false;
    this.moderationReason = '多次举报自动隐藏';
  }
  
  return this.save();
};

// 实例方法 - 编辑评论
commentSchema.methods.editContent = function(newContent) {
  if (this.content !== newContent) {
    // 保存编辑历史
    this.editHistory.push({
      content: this.content
    });
    
    this.content = newContent;
    this.isEdited = true;
    this.lastEditedAt = new Date();
    
    // 如果评论被编辑，重置审核状态
    if (this.editHistory.length === 1) {
      this.isApproved = true;
    }
  }
  
  return this.save();
};

// 静态方法 - 获取课程评论（带分页）
commentSchema.statics.getCourseComments = function(courseId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1,
    onlyTopLevel = true,
    currentUserId = null
  } = options;
  
  const query = {
    courseId,
    isApproved: true,
    isDeleted: false
  };
  
  if (onlyTopLevel) {
    query.parentId = null;
  }
  
  return this.find(query)
    .populate('author', 'username avatar role')
    .populate({
      path: 'replies',
      match: { isApproved: true, isDeleted: false },
      populate: {
        path: 'author',
        select: 'username avatar role'
      }
    })
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .then(comments => {
      // 为每个评论添加当前用户的点赞状态
      if (currentUserId) {
        comments.forEach(comment => {
          comment._currentUserId = currentUserId;
        });
      }
      return comments;
    });
};

// 静态方法 - 获取评论统计
commentSchema.statics.getCommentStats = function(courseId) {
  return this.aggregate([
    {
      $match: {
        courseId,
        isApproved: true,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        totalLikes: { $sum: '$likesCount' },
        ratingDistribution: {
          $push: {
            $cond: [{ $ne: ['$rating', null] }, '$rating', '$$REMOVE']
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalComments: 1,
        averageRating: { $round: ['$averageRating', 1] },
        totalLikes: 1,
        ratingDistribution: 1
      }
    }
  ]);
};

// 静态方法 - 获取用户评论历史
commentSchema.statics.getUserComments = function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;
  
  return this.find({
    author: userId,
    isDeleted: false
  })
    .populate('author', 'username avatar')
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// 中间件 - 删除评论时同时删除回复
commentSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.isDeleted === true) {
    // 软删除所有回复
    const commentId = this.getQuery()._id;
    this.model.updateMany(
      { parentId: commentId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).exec();
  }
  next();
});

module.exports = mongoose.model('Comment', commentSchema);