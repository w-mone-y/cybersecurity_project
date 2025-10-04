// SQL注入演示系统
class SQLInjectionDemo {
    constructor() {
        this.users = [
            { id: 1, username: 'admin', password: 'password', role: '管理员', balance: '$50,000' },
            { id: 2, username: 'john_doe', password: 'secret123', role: '用户', balance: '$2,500' },
            { id: 3, username: 'jane_smith', password: 'mypassword', role: '用户', balance: '$7,800' }
        ];
        
        this.originalUsers = [...this.users];
        this.attackLog = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.addLogEntry('SQL注入演示环境已就绪', 'info');
    }

    setupEventListeners() {
        // 模态框关闭事件
        document.querySelector('#secure-code-modal .close').addEventListener('click', () => {
            this.closeSecureCodeModal();
        });
        
        // 表单回车提交
        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.attemptLogin();
            }
        });
        
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.attemptLogin();
            }
        });
    }

    attemptLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // 构造SQL查询（模拟不安全的方式）
        const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
        
        this.updateSQLDisplay(query);
        this.addLogEntry(`尝试登录: 用户名="${username}", 密码="${password}"`, 'info');
        
        // 检查是否为注入攻击
        if (this.detectSQLInjection(username, password)) {
            this.handleSQLInjection(username, password, query);
        } else {
            this.handleNormalLogin(username, password);
        }
    }

    detectSQLInjection(username, password) {
        const injectionPatterns = [
            /['";]/,                    // 引号
            /--/,                      // SQL注释
            /\/\*/,                    // 多行注释
            /\bOR\b/i,                 // OR关键字
            /\bAND\b/i,                // AND关键字
            /\bUNION\b/i,              // UNION关键字
            /\bSELECT\b/i,             // SELECT关键字
            /\bINSERT\b/i,             // INSERT关键字
            /\bUPDATE\b/i,             // UPDATE关键字
            /\bDELETE\b/i,             // DELETE关键字
            /\bDROP\b/i,               // DROP关键字
            /\bEXEC\b/i,               // EXEC关键字
            /=/                        // 等号（常用于条件绕过）
        ];
        
        return injectionPatterns.some(pattern => 
            pattern.test(username) || pattern.test(password)
        );
    }

    handleSQLInjection(username, password, query) {
        this.addLogEntry('检测到SQL注入攻击！', 'warning');
        
        // 分析注入类型并模拟结果
        if (username.includes("'--") || password.includes("'--")) {
            this.simulateCommentInjection(username, password);
        } else if (username.includes("' OR 1=1") || password.includes("' OR 1=1")) {
            this.simulateBooleanInjection();
        } else if (username.includes("UNION") || password.includes("UNION")) {
            this.simulateUnionInjection();
        } else if (username.includes("DROP") || password.includes("DROP")) {
            this.simulateDestructiveInjection();
        } else {
            this.simulateGenericInjection();
        }
    }

    simulateCommentInjection(username, password) {
        this.addLogEntry('类型: 注释绕过攻击 (Comment-based bypass)', 'warning');
        this.addLogEntry('攻击原理: 使用 -- 注释掉密码检查部分', 'info');
        
        // 模拟成功绕过
        if (username.includes('admin')) {
            this.showLoginResult(true, '登录成功！欢迎管理员');
            this.addLogEntry('攻击成功：通过注释绕过了密码验证', 'error');
            this.highlightUser('admin');
        } else {
            this.showLoginResult(true, '登录成功！但用户不存在时创建了新会话');
            this.addLogEntry('攻击成功：绕过了认证机制', 'error');
        }
    }

    simulateBooleanInjection() {
        this.addLogEntry('类型: 布尔盲注攻击 (Boolean-based blind injection)', 'warning');
        this.addLogEntry('攻击原理: 使用 OR 1=1 使条件永远为真', 'info');
        
        this.showLoginResult(true, '登录成功！获得了所有用户权限');
        this.addLogEntry('攻击成功：条件被修改为永真条件', 'error');
        this.highlightAllUsers();
    }

    simulateUnionInjection() {
        this.addLogEntry('类型: 联合查询注入 (UNION-based injection)', 'warning');
        this.addLogEntry('攻击原理: 使用 UNION SELECT 获取额外数据', 'info');
        
        this.showLoginResult(true, '登录成功！并获取到了额外的数据库信息');
        this.addLogEntry('攻击成功：通过UNION查询泄露了敏感数据', 'error');
        this.showSensitiveData();
    }

    simulateDestructiveInjection() {
        this.addLogEntry('类型: 破坏性注入 (Destructive injection)', 'error');
        this.addLogEntry('攻击原理: 尝试删除或修改数据库表', 'error');
        
        this.showLoginResult(false, '严重错误：数据库表被删除！');
        this.addLogEntry('模拟攻击：数据库表被删除（仅模拟，实际环境中极其危险）', 'error');
        this.simulateTableDeletion();
    }

    simulateGenericInjection() {
        this.addLogEntry('类型: 通用SQL注入攻击', 'warning');
        this.showLoginResult(false, '数据库查询错误，但可能泄露了系统信息');
        this.addLogEntry('攻击部分成功：虽然登录失败，但暴露了数据库结构信息', 'warning');
    }

    handleNormalLogin(username, password) {
        // 正常登录逻辑
        const user = this.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.showLoginResult(true, `欢迎，${user.username}！`);
            this.addLogEntry('正常登录成功', 'success');
            this.highlightUser(username);
        } else {
            this.showLoginResult(false, '用户名或密码错误');
            this.addLogEntry('正常登录失败：凭据不匹配', 'info');
        }
    }

    showLoginResult(success, message) {
        const resultBox = document.getElementById('result-box');
        const resultMessage = document.getElementById('result-message');
        
        resultBox.style.display = 'block';
        resultMessage.textContent = message;
        
        if (success) {
            resultBox.className = 'result-box result-success';
        } else {
            resultBox.className = 'result-box result-error';
        }
        
        // 3秒后自动隐藏
        setTimeout(() => {
            resultBox.style.display = 'none';
        }, 5000);
    }

    updateSQLDisplay(query) {
        document.getElementById('sql-query').textContent = query;
        
        // 高亮危险的SQL关键字
        const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'UNION', 'OR 1=1'];
        let highlightedQuery = query;
        
        dangerous.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            highlightedQuery = highlightedQuery.replace(regex, 
                `<span style="color: #ff4757; background: rgba(255, 71, 87, 0.2); padding: 2px 4px; border-radius: 3px;">${keyword}</span>`
            );
        });
        
        document.getElementById('sql-query').innerHTML = highlightedQuery;
    }

    highlightUser(username) {
        // 高亮特定用户行
        const rows = document.querySelectorAll('#database-table tbody tr');
        rows.forEach(row => {
            row.style.background = 'var(--card-bg)';
            if (row.cells[1].textContent === username) {
                row.style.background = 'rgba(0, 255, 65, 0.2)';
                row.style.border = '2px solid var(--primary-color)';
            }
        });
    }

    highlightAllUsers() {
        // 高亮所有用户行
        const rows = document.querySelectorAll('#database-table tbody tr');
        rows.forEach(row => {
            row.style.background = 'rgba(255, 193, 7, 0.2)';
            row.style.border = '2px solid #ffc107';
        });
    }

    showSensitiveData() {
        // 模拟显示额外的敏感数据
        const table = document.getElementById('database-table');
        const tbody = table.querySelector('tbody');
        
        // 添加一个显示泄露数据的行
        const leakRow = document.createElement('tr');
        leakRow.style.background = 'rgba(255, 71, 87, 0.2)';
        leakRow.style.border = '2px solid #ff4757';
        leakRow.innerHTML = `
            <td colspan="5" style="text-align: center; color: #ff4757; font-weight: bold;">
                ⚠️ 通过UNION查询泄露的敏感信息 ⚠️<br>
                数据库版本: MySQL 8.0.25 | 服务器: production-db-01 | 管理员密钥: abc123...
            </td>
        `;
        
        tbody.appendChild(leakRow);
        
        setTimeout(() => {
            tbody.removeChild(leakRow);
        }, 10000);
    }

    simulateTableDeletion() {
        // 模拟表被删除的效果
        const table = document.getElementById('database-table');
        const tbody = table.querySelector('tbody');
        
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #ff4757; font-weight: bold; padding: 2rem;">
                    ❌ TABLE 'users' DROPPED ❌<br>
                    <small>数据库表已被删除（模拟效果）</small>
                </td>
            </tr>
        `;
    }

    // 快速载荷测试
    tryPayload(payload) {
        document.getElementById('username').value = payload;
        document.getElementById('password').value = '';
        this.attemptLogin();
    }

    // 自定义载荷测试
    tryCustomPayload() {
        const payload = document.getElementById('custom-payload').value;
        if (!payload) {
            this.addLogEntry('请输入自定义载荷', 'warning');
            return;
        }
        
        document.getElementById('username').value = payload;
        document.getElementById('password').value = '';
        this.addLogEntry(`测试自定义载荷: ${payload}`, 'info');
        this.attemptLogin();
    }

    // 重置演示
    resetDemo() {
        this.users = [...this.originalUsers];
        
        // 重置表单
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('custom-payload').value = '';
        document.getElementById('result-box').style.display = 'none';
        
        // 重置SQL显示
        document.getElementById('sql-query').textContent = "SELECT * FROM users WHERE username='' AND password=''";
        
        // 重置数据库表显示
        const tbody = document.querySelector('#database-table tbody');
        tbody.innerHTML = `
            <tr>
                <td>1</td>
                <td>admin</td>
                <td>5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8</td>
                <td>管理员</td>
                <td>$50,000</td>
            </tr>
            <tr>
                <td>2</td>
                <td>john_doe</td>
                <td>ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f</td>
                <td>用户</td>
                <td>$2,500</td>
            </tr>
            <tr>
                <td>3</td>
                <td>jane_smith</td>
                <td>2c70e12b7a0646f92279f427c7b38e7334d8e5389cff167a1dc30e73f826b683</td>
                <td>用户</td>
                <td>$7,800</td>
            </tr>
        `;
        
        // 重置行样式
        document.querySelectorAll('#database-table tbody tr').forEach(row => {
            row.style.background = 'var(--card-bg)';
            row.style.border = '1px solid var(--border-color)';
        });
        
        this.addLogEntry('演示环境已重置', 'info');
    }

    // 显示安全代码示例
    showSecureCode() {
        document.getElementById('secure-code-modal').style.display = 'block';
    }

    closeSecureCodeModal() {
        document.getElementById('secure-code-modal').style.display = 'none';
    }

    // 日志系统
    addLogEntry(message, type = 'info') {
        const logContent = document.getElementById('attack-log');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${message}</span>
        `;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;

        // 限制日志条目数量
        const entries = logContent.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            logContent.removeChild(entries[1]); // 保留第一条初始化消息
        }
        
        this.attackLog.push({ timestamp, message, type });
    }

    // 显示通知
    showNotification(message, type = 'info') {
        if (window.cyberSecAcademy) {
            window.cyberSecAcademy.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// 全局函数
function goHome() {
    window.location.href = '../index.html';
}

function attemptLogin() {
    sqlDemo.attemptLogin();
}

function tryPayload(payload) {
    sqlDemo.tryPayload(payload);
}

function tryCustomPayload() {
    sqlDemo.tryCustomPayload();
}

function resetDemo() {
    sqlDemo.resetDemo();
}

function showSecureCode() {
    sqlDemo.showSecureCode();
}

function closeSecureCodeModal() {
    sqlDemo.closeSecureCodeModal();
}

// 初始化SQL注入演示
let sqlDemo;
document.addEventListener('DOMContentLoaded', () => {
    sqlDemo = new SQLInjectionDemo();
    
    // 完成实验室
    if (window.cyberSecAcademy) {
        window.cyberSecAcademy.completeLab('sql-injection', 75);
    }
});