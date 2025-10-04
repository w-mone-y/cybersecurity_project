// 密码破解实验逻辑
class PasswordCracker {
    constructor() {
        this.targetPassword = '';
        this.isRunning = false;
        this.attempts = 0;
        this.startTime = 0;
        this.currentPassword = '';
        this.attackMode = 'dictionary';
        this.charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
        this.commonPasswords = [
            '123456', 'password', '123456789', '12345678', '12345',
            '111111', '1234567', 'sunshine', 'qwerty', 'iloveyou',
            'admin', 'welcome', '123123', '654321', 'password1',
            'abc123', 'dragon', '1234', 'hello', 'letmein',
            'monkey', '1234567890', 'welcome1', 'master', 'superman'
        ];
        this.currentIndex = 0;
        this.crackingInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showEducationModal();
        this.updateCharset();
    }

    setupEventListeners() {
        // 密码长度滑块
        const lengthSlider = document.getElementById('password-length');
        const lengthDisplay = document.getElementById('length-display');
        lengthSlider.addEventListener('input', (e) => {
            lengthDisplay.textContent = e.target.value;
        });

        // 字符集选项
        const charsetInputs = document.querySelectorAll('.charset-options input[type="checkbox"]');
        charsetInputs.forEach(input => {
            input.addEventListener('change', () => this.updateCharset());
        });

        // 攻击模式
        document.getElementById('attack-mode').addEventListener('change', (e) => {
            this.attackMode = e.target.value;
        });

        // 按钮事件
        document.getElementById('generate-password').addEventListener('click', () => this.generateTargetPassword());
        document.getElementById('start-crack').addEventListener('click', () => this.startCracking());
        document.getElementById('stop-crack').addEventListener('click', () => this.stopCracking());

        // 模态框事件
        document.getElementById('understand-btn').addEventListener('click', () => this.closeEducationModal());
        document.querySelector('.close').addEventListener('click', () => this.closeEducationModal());
    }

    updateCharset() {
        let charset = '';
        if (document.getElementById('lowercase').checked) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (document.getElementById('uppercase').checked) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (document.getElementById('numbers').checked) charset += '0123456789';
        if (document.getElementById('symbols').checked) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        this.charset = charset;
    }

    generateTargetPassword() {
        const length = parseInt(document.getElementById('password-length').value);
        this.updateCharset();
        
        if (this.charset.length === 0) {
            this.addLogEntry('错误：请至少选择一种字符集', 'error');
            return;
        }

        let password = '';
        for (let i = 0; i < length; i++) {
            password += this.charset[Math.floor(Math.random() * this.charset.length)];
        }

        this.targetPassword = password;
        document.getElementById('target-password').textContent = '*'.repeat(length) + ' (' + length + '位)';
        this.updatePasswordStrength(password);
        this.addLogEntry(`已生成${length}位目标密码`, 'info');
        this.resetStats();
    }

    updatePasswordStrength(password) {
        let strength = 0;
        let strengthText = '';
        let strengthColor = '';

        // 长度评分
        if (password.length >= 8) strength += 25;
        else if (password.length >= 6) strength += 15;
        else if (password.length >= 4) strength += 5;

        // 字符类型评分
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 30;

        // 确定强度等级
        if (strength >= 80) {
            strengthText = '非常强';
            strengthColor = '#00ff41';
        } else if (strength >= 60) {
            strengthText = '强';
            strengthColor = '#ffc107';
        } else if (strength >= 40) {
            strengthText = '中等';
            strengthColor = '#ff6b35';
        } else if (strength >= 20) {
            strengthText = '弱';
            strengthColor = '#ff4757';
        } else {
            strengthText = '非常弱';
            strengthColor = '#dc3545';
        }

        document.getElementById('strength-fill').style.width = strength + '%';
        document.getElementById('strength-fill').style.background = strengthColor;
        document.getElementById('strength-text').textContent = strengthText;
    }

    startCracking() {
        if (!this.targetPassword) {
            this.addLogEntry('错误：请先生成目标密码', 'error');
            return;
        }

        this.isRunning = true;
        this.attempts = 0;
        this.startTime = Date.now();
        this.currentIndex = 0;

        document.getElementById('start-crack').disabled = true;
        document.getElementById('stop-crack').disabled = false;
        document.getElementById('result-display').style.display = 'none';

        this.addLogEntry(`开始${this.getAttackModeName()}攻击...`, 'info');

        // 根据攻击模式启动不同的破解方法
        if (this.attackMode === 'dictionary') {
            this.startDictionaryAttack();
        } else if (this.attackMode === 'brute-force') {
            this.startBruteForceAttack();
        } else {
            this.startHybridAttack();
        }
    }

    getAttackModeName() {
        const modes = {
            'dictionary': '字典',
            'brute-force': '暴力破解',
            'hybrid': '混合'
        };
        return modes[this.attackMode] || '未知';
    }

    startDictionaryAttack() {
        this.crackingInterval = setInterval(() => {
            if (!this.isRunning || this.currentIndex >= this.commonPasswords.length) {
                if (this.currentIndex >= this.commonPasswords.length) {
                    this.addLogEntry('字典攻击完成，未找到匹配密码', 'warning');
                    this.stopCracking();
                }
                return;
            }

            const password = this.commonPasswords[this.currentIndex];
            this.currentPassword = password;
            this.attempts++;

            this.updateUI();

            if (password === this.targetPassword) {
                this.crackingSuccess();
            } else {
                this.currentIndex++;
            }
        }, 100); // 每100ms尝试一个密码
    }

    startBruteForceAttack() {
        this.currentPassword = this.charset[0].repeat(this.targetPassword.length);
        this.crackingInterval = setInterval(() => {
            if (!this.isRunning) return;

            this.attempts++;
            this.updateUI();

            if (this.currentPassword === this.targetPassword) {
                this.crackingSuccess();
            } else {
                this.currentPassword = this.getNextBruteForcePassword();
                if (!this.currentPassword) {
                    this.addLogEntry('暴力破解完成，已尝试所有可能组合', 'warning');
                    this.stopCracking();
                }
            }
        }, 50); // 更快的尝试速度
    }

    startHybridAttack() {
        // 先尝试字典攻击，然后转为暴力破解
        this.addLogEntry('开始字典攻击阶段...', 'info');
        this.startDictionaryAttack();

        // 如果字典攻击失败，切换到暴力破解
        setTimeout(() => {
            if (this.isRunning && this.currentIndex >= this.commonPasswords.length) {
                clearInterval(this.crackingInterval);
                this.addLogEntry('字典攻击完成，切换到暴力破解...', 'info');
                this.startBruteForceAttack();
            }
        }, this.commonPasswords.length * 100 + 1000);
    }

    getNextBruteForcePassword() {
        // 简化版本：仅用于演示，实际暴力破解会更复杂
        const chars = this.charset;
        const passwordArray = this.currentPassword.split('');
        
        for (let i = passwordArray.length - 1; i >= 0; i--) {
            const currentIndex = chars.indexOf(passwordArray[i]);
            if (currentIndex < chars.length - 1) {
                passwordArray[i] = chars[currentIndex + 1];
                break;
            } else {
                passwordArray[i] = chars[0];
                if (i === 0) return null; // 所有组合已尝试完
            }
        }
        
        return passwordArray.join('');
    }

    updateUI() {
        document.getElementById('attempts').textContent = this.attempts.toLocaleString();
        document.getElementById('current-password').textContent = this.currentPassword;
        
        const elapsed = (Date.now() - this.startTime) / 1000;
        const speed = Math.round(this.attempts / elapsed);
        document.getElementById('speed').textContent = `${speed} attempts/sec`;

        // 估算剩余时间（仅用于演示）
        if (this.attackMode === 'dictionary') {
            const remaining = this.commonPasswords.length - this.currentIndex;
            const estimatedTime = Math.round(remaining * 0.1);
            document.getElementById('estimated-time').textContent = `${estimatedTime}s`;
        } else {
            document.getElementById('estimated-time').textContent = '计算中...';
        }

        // 成功率（简化计算）
        const maxAttempts = this.attackMode === 'dictionary' ? this.commonPasswords.length : Math.pow(this.charset.length, this.targetPassword.length);
        const successRate = Math.min(100, (this.attempts / maxAttempts) * 100);
        document.getElementById('success-rate').textContent = `${successRate.toFixed(2)}%`;

        // 进度条
        const progress = Math.min(100, successRate);
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-percentage').textContent = `${progress.toFixed(1)}%`;
    }

    crackingSuccess() {
        this.isRunning = false;
        clearInterval(this.crackingInterval);
        
        const endTime = Date.now();
        const totalTime = (endTime - this.startTime) / 1000;
        const avgSpeed = Math.round(this.attempts / totalTime);

        // 显示成功结果
        document.getElementById('result-display').style.display = 'block';
        document.getElementById('cracked-password').textContent = this.targetPassword;
        document.getElementById('final-attempts').textContent = this.attempts.toLocaleString();
        document.getElementById('crack-time').textContent = `${totalTime.toFixed(2)}秒`;
        document.getElementById('final-speed').textContent = `${avgSpeed} attempts/sec`;

        // 重置按钮状态
        document.getElementById('start-crack').disabled = false;
        document.getElementById('stop-crack').disabled = true;

        this.addLogEntry(`密码破解成功！密码是: ${this.targetPassword}`, 'success');
        this.addLogEntry(`总耗时: ${totalTime.toFixed(2)}秒，尝试${this.attempts}次`, 'info');

        // 添加到用户进度
        if (window.cyberSecAcademy) {
            window.cyberSecAcademy.completeLab('password-cracking', 50);
        }
    }

    stopCracking() {
        this.isRunning = false;
        clearInterval(this.crackingInterval);
        
        document.getElementById('start-crack').disabled = false;
        document.getElementById('stop-crack').disabled = true;
        
        this.addLogEntry('密码破解已停止', 'warning');
    }

    resetStats() {
        this.attempts = 0;
        this.currentIndex = 0;
        document.getElementById('attempts').textContent = '0';
        document.getElementById('speed').textContent = '0 attempts/sec';
        document.getElementById('estimated-time').textContent = '未知';
        document.getElementById('success-rate').textContent = '0%';
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-percentage').textContent = '0%';
        document.getElementById('current-password').textContent = '等待开始...';
    }

    addLogEntry(message, type = 'info') {
        const logContent = document.getElementById('log-content');
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
            logContent.removeChild(entries[0]);
        }
    }

    showEducationModal() {
        document.getElementById('education-modal').style.display = 'block';
    }

    closeEducationModal() {
        document.getElementById('education-modal').style.display = 'none';
    }
}

// 挑战模式
function startChallenge(level) {
    const challenges = {
        'easy': {
            length: 4,
            charset: {
                lowercase: false,
                uppercase: false,
                numbers: true,
                symbols: false
            },
            mode: 'brute-force'
        },
        'medium': {
            length: 6,
            charset: {
                lowercase: true,
                uppercase: false,
                numbers: true,
                symbols: false
            },
            mode: 'dictionary'
        },
        'hard': {
            length: 8,
            charset: {
                lowercase: true,
                uppercase: true,
                numbers: true,
                symbols: false
            },
            mode: 'hybrid'
        },
        'expert': {
            length: 12,
            charset: {
                lowercase: true,
                uppercase: true,
                numbers: true,
                symbols: true
            },
            mode: 'hybrid'
        }
    };

    const challenge = challenges[level];
    if (!challenge) return;

    // 设置挑战参数
    document.getElementById('password-length').value = challenge.length;
    document.getElementById('length-display').textContent = challenge.length;
    document.getElementById('attack-mode').value = challenge.mode;

    // 设置字符集
    document.getElementById('lowercase').checked = challenge.charset.lowercase;
    document.getElementById('uppercase').checked = challenge.charset.uppercase;
    document.getElementById('numbers').checked = challenge.charset.numbers;
    document.getElementById('symbols').checked = challenge.charset.symbols;

    // 自动生成密码并开始破解
    setTimeout(() => {
        cracker.generateTargetPassword();
        setTimeout(() => {
            cracker.startCracking();
        }, 1000);
    }, 500);

    cracker.addLogEntry(`开始${level}级挑战！`, 'info');
}

// 返回首页
function goHome() {
    window.location.href = '../index.html';
}

// 初始化密码破解器
let cracker;
document.addEventListener('DOMContentLoaded', () => {
    cracker = new PasswordCracker();
});