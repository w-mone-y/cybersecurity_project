const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * JWT认证中间件
 * 验证请求头中的Authorization令牌
 */
const auth = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，缺少认证令牌'
      });
    }
    
    // 检查Bearer格式
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7, authHeader.length) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，令牌格式无效'
      });
    }
    
    try {
      // 验证令牌
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // 检查用户是否存在
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '令牌无效，用户不存在'
        });
      }
      
      // 将用户ID添加到请求对象
      req.userId = decoded.userId;
      req.user = user;
      
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '令牌已过期，请重新登录'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: '令牌无效'
        });
      } else {
        throw jwtError;
      }
    }
    
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * 可选认证中间件
 * 如果有令牌则验证，没有则继续执行
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return next();
  }
  
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7, authHeader.length) 
    : authHeader;
  
  if (!token) {
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (user) {
      req.userId = decoded.userId;
      req.user = user;
    }
  } catch (error) {
    // 可选认证失败不返回错误，继续执行
    console.log('可选认证失败:', error.message);
  }
  
  next();
};

/**
 * 角色验证中间件
 * @param {Array} roles 允许的角色列表
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录才能访问此资源'
      });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '您没有权限访问此资源'
      });
    }
    
    next();
  };
};

/**
 * 用户自身或管理员验证中间件
 * 用于保护用户只能操作自己的数据，除非是管理员
 */
const authorizeOwnerOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录才能访问此资源'
      });
    }
    
    const targetUserId = req.params[userIdField] || req.body[userIdField];
    
    // 管理员可以操作任何用户的数据
    if (req.user.role === 'admin') {
      return next();
    }
    
    // 用户只能操作自己的数据
    if (req.user._id.toString() !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: '您只能操作自己的数据'
      });
    }
    
    next();
  };
};

/**
 * 邮箱验证检查中间件
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '需要登录才能访问此资源'
    });
  }
  
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: '请先验证您的邮箱后再进行此操作'
    });
  }
  
  next();
};

module.exports = {
  auth,
  optionalAuth,
  authorize,
  authorizeOwnerOrAdmin,
  requireEmailVerification
};