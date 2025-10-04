// 网络安全学习平台 - 主要交互功能
class CyberSecAcademy {
    constructor() {
        this.userProgress = JSON.parse(localStorage.getItem('cyberSecProgress')) || {
            completedCourses: 0,
            completedLabs: 0,
            totalPoints: 0,
            badges: [],
            unlockedLevels: ['basics']
        };
        this.currentLab = null;
        this.terminals = [];
        this.init();
    }

    init() {
        this.initNavigation();
        this.initTerminalAnimation();
        this.initProgressTracking();
        this.initParticleEffect();
        this.initScrollAnimations();
        this.initGlobalRipples();
        this.initTiltOnHome();
        this.loadProgress();
    }

    // 导航功能
    initNavigation() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }

        // 平滑滚动
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // 终端动画效果
    initTerminalAnimation() {
        const terminal = document.querySelector('.terminal-body');
        if (!terminal) return;

        const commands = [
            'nmap -sS -O target.com',
            'hydra -l admin -P wordlist.txt ssh://192.168.1.100',
            'john --wordlist=rockyou.txt hash.txt',
            'sqlmap -u "http://target.com/login.php" --forms',
            'aircrack-ng -w wordlist.txt capture.cap',
            'metasploit > use exploit/multi/handler'
        ];

        let currentCommand = 0;

        setInterval(() => {
            const commandElement = document.querySelector('.typing-animation');
            if (commandElement) {
                commandElement.textContent = commands[currentCommand];
                currentCommand = (currentCommand + 1) % commands.length;
            }
        }, 4000);
    }

    // 粒子背景效果
    initParticleEffect() {
        const canvas = document.createElement('canvas');
        canvas.id = 'particle-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '-1';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let particles = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function createParticles() {
            for (let i = 0; i < 100; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2,
                    opacity: Math.random() * 0.5
                });
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;

                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 255, 65, ${particle.opacity})`;
                ctx.fill();
            });

            requestAnimationFrame(animateParticles);
        }

        resizeCanvas();
        createParticles();
        animateParticles();
        window.addEventListener('resize', resizeCanvas);
    }

    // 滚动动画
    initScrollAnimations() {
        // 首页元素丝滑显现
        const reveal = new IntersectionObserver((entries)=>{
            entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
        },{threshold:0.15});
        document.querySelectorAll('.course-card, .lab-card, .tool-item, .progress-card').forEach(el=>{
            el.classList.add('reveal');
            reveal.observe(el);
        });
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.course-card, .lab-card, .tool-item, .progress-card').forEach(el => {
            observer.observe(el);
        });
    }

    // 全局涟漪效果（首页）
    initGlobalRipples() {
        document.querySelectorAll('.btn').forEach(btn=>{
            btn.addEventListener('click', (e)=>{
                const rect = btn.getBoundingClientRect();
                btn.style.setProperty('--ripple-x', (e.clientX-rect.left)+'px');
                btn.style.setProperty('--ripple-y', (e.clientY-rect.top)+'px');
                btn.classList.add('is-animating');
                setTimeout(()=> btn.classList.remove('is-animating'), 500);
            });
        });
    }

    // 首页卡片倾斜
    initTiltOnHome() {
        const cards = document.querySelectorAll('.course-card, .lab-card, .tool-item, .progress-card');
        cards.forEach(card=>{
            card.classList.add('tilt');
            card.addEventListener('mousemove', (e)=>{
                const r = card.getBoundingClientRect();
                const x = e.clientX - r.left; const y = e.clientY - r.top;
                const rx = ((y/r.height)-0.5)*-6; const ry = ((x/r.width)-0.5)*6;
                card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
            });
            card.addEventListener('mouseleave', ()=>{ card.style.transform='perspective(800px) rotateX(0) rotateY(0)'; });
        });
    }

    // 进度跟踪
    initProgressTracking() {
        this.updateProgressDisplay();
    }

    updateProgressDisplay() {
        const completedCoursesEl = document.getElementById('completed-courses');
        const completedLabsEl = document.getElementById('completed-labs');
        const totalPointsEl = document.getElementById('total-points');

        if (completedCoursesEl) {
            this.animateNumber(completedCoursesEl, Array.isArray(this.userProgress.completedCourses) ? this.userProgress.completedCourses.length : this.userProgress.completedCourses);
        }
        if (completedLabsEl) {
            this.animateNumber(completedLabsEl, Array.isArray(this.userProgress.completedLabs) ? this.userProgress.completedLabs.length : this.userProgress.completedLabs);
        }
        if (totalPointsEl) {
            this.animateNumber(totalPointsEl, this.userProgress.totalPoints);
        }
    }

    // 数字动画效果
    animateNumber(element, targetNumber) {
        const currentNumber = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetNumber - currentNumber) / 20);
        
        if (currentNumber < targetNumber) {
            element.textContent = Math.min(currentNumber + increment, targetNumber);
            setTimeout(() => this.animateNumber(element, targetNumber), 50);
        }
    }

    saveProgress() {
        localStorage.setItem('cyberSecProgress', JSON.stringify(this.userProgress));
    }

    loadProgress() {
        this.updateProgressDisplay();
    }

    // 课程功能
    openCourse(courseId) {
        const courses = {
            'basics': {
                title: '网络安全基础',
                url: 'pages/course-basics.html',
                points: 100
            },
            'crypto': {
                title: '密码学与加密',
                url: 'pages/course-crypto.html',
                points: 150
            },
            'pentest': {
                title: '渗透测试',
                url: 'pages/course-pentest.html',
                points: 200
            },
            'websec': {
                title: 'Web安全',
                url: 'pages/course-websec.html',
                points: 150
            },
            'forensics': {
                title: '数字取证',
                url: 'pages/course-forensics.html',
                points: 180
            },
            'reverse': {
                title: '逆向工程',
                url: 'pages/course-reverse.html',
                points: 250
            },
            'siem': {
                title: '蓝队与SIEM入门',
                url: 'pages/course-siem.html',
                points: 140
            },
            'threat': {
                title: '威胁建模实践',
                url: 'pages/course-threat.html',
                points: 160
            },
            'mobile': {
                title: '移动应用安全',
                url: 'pages/course-mobile.html',
                points: 160
            }
        };

        const course = courses[courseId];
        if (course) {
            this.showNotification(`正在打开课程: ${course.title}`);
            setTimeout(() => {
                window.location.href = course.url;
            }, 1000);
        }
    }

    // 实验室功能
    openLab(labId) {
        const labs = {
            'password-cracking': {
                title: '密码破解实验',
                url: 'exercises/password-cracking.html',
                points: 50
            },
            'sql-injection': {
                title: 'SQL注入演示',
                url: 'exercises/sql-injection.html',
                points: 75
            },
            'network-scan': {
                title: '网络扫描模拟',
                url: 'exercises/network-scan.html',
                points: 60
            },
            'crypto-challenge': {
                title: '加密解密挑战',
                url: 'exercises/crypto-challenge.html',
                points: 100
            }
        };

        const lab = labs[labId];
        if (lab) {
            this.showNotification(`正在启动实验: ${lab.title}`);
            setTimeout(() => {
                window.location.href = lab.url;
            }, 1000);
        }
    }

    // 完成课程
    completeCourse(courseId, points = 100) {
        if (!this.userProgress.completedCourses.includes) {
            this.userProgress.completedCourses = [];
        }
        
        if (!this.userProgress.completedCourses.includes(courseId)) {
            this.userProgress.completedCourses.push(courseId);
            this.userProgress.totalPoints += points;
            this.saveProgress();
            this.updateProgressDisplay();
            this.showNotification(`课程完成！获得 ${points} 积分！`, 'success');
            this.checkAchievements();
        }
    }

    // 完成实验
    completeLab(labId, points = 50) {
        if (!this.userProgress.completedLabs.includes) {
            this.userProgress.completedLabs = [];
        }
        
        if (!this.userProgress.completedLabs.includes(labId)) {
            this.userProgress.completedLabs.push(labId);
            this.userProgress.totalPoints += points;
            this.saveProgress();
            this.updateProgressDisplay();
            this.showNotification(`实验完成！获得 ${points} 积分！`, 'success');
            this.checkAchievements();
        }
    }

    // 检查成就
    checkAchievements() {
        const achievements = [
            {
                id: 'first-course',
                name: '初学者',
                condition: () => Array.isArray(this.userProgress.completedCourses) && this.userProgress.completedCourses.length >= 1,
                points: 50
            },
            {
                id: 'lab-master',
                name: '实验大师',
                condition: () => Array.isArray(this.userProgress.completedLabs) && this.userProgress.completedLabs.length >= 3,
                points: 100
            },
            {
                id: 'point-collector',
                name: '积分收集者',
                condition: () => this.userProgress.totalPoints >= 500,
                points: 75
            }
        ];

        achievements.forEach(achievement => {
            if (!this.userProgress.badges.includes(achievement.id) && achievement.condition()) {
                this.userProgress.badges.push(achievement.id);
                this.userProgress.totalPoints += achievement.points;
                this.showNotification(`获得成就: ${achievement.name}！`, 'achievement');
                this.saveProgress();
            }
        });
    }

    // 通知系统
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'achievement' ? 'fa-trophy' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 创建交互式终端
    createInteractiveTerminal(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const terminal = document.createElement('div');
        terminal.className = 'interactive-terminal';
        terminal.innerHTML = `
            <div class="terminal-header">
                <span class="terminal-btn red"></span>
                <span class="terminal-btn yellow"></span>
                <span class="terminal-btn green"></span>
                <span class="terminal-title">CyberSec Terminal</span>
            </div>
            <div class="terminal-content">
                <div class="terminal-output"></div>
                <div class="terminal-input-line">
                    <span class="prompt">user@cybersec:~$ </span>
                    <input type="text" class="terminal-input" placeholder="输入命令...">
                </div>
            </div>
        `;

        container.appendChild(terminal);

        const input = terminal.querySelector('.terminal-input');
        const output = terminal.querySelector('.terminal-output');

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const command = input.value.trim();
                this.processCommand(command, output);
                input.value = '';
            }
        });

        return terminal;
    }

    // 处理终端命令
    processCommand(command, outputElement) {
        const commandLine = document.createElement('div');
        commandLine.innerHTML = `<span class="prompt">user@cybersec:~$ </span><span>${command}</span>`;
        outputElement.appendChild(commandLine);

        const response = document.createElement('div');
        response.className = 'command-response';

        switch (command.toLowerCase()) {
            case 'help':
                response.innerHTML = `
                    可用命令：<br>
                    - help: 显示帮助信息<br>
                    - nmap: 网络扫描工具<br>
                    - hydra: 密码破解工具<br>
                    - clear: 清除屏幕<br>
                    - whoami: 显示当前用户<br>
                    - progress: 显示学习进度
                `;
                break;
            case 'nmap':
                response.innerHTML = `
                    <span class="text-green">Starting Nmap scan...</span><br>
                    Host is up (0.023s latency)<br>
                    <span class="text-green">PORT     STATE SERVICE</span><br>
                    <span class="text-green">22/tcp   open  ssh</span><br>
                    <span class="text-green">80/tcp   open  http</span><br>
                    <span class="text-green">443/tcp  open  https</span>
                `;
                break;
            case 'hydra':
                response.innerHTML = `
                    <span class="text-yellow">Hydra v9.1 starting...</span><br>
                    [INFO] Testing passwords from wordlist<br>
                    <span class="text-green">[SUCCESS] Found credentials: admin:password123</span>
                `;
                break;
            case 'clear':
                outputElement.innerHTML = '';
                return;
            case 'whoami':
                response.innerHTML = `cybersec-student`;
                break;
            case 'progress':
                response.innerHTML = `
                    学习进度：<br>
                    - 完成课程: ${this.userProgress.completedCourses}<br>
                    - 完成实验: ${this.userProgress.completedLabs}<br>
                    - 总积分: ${this.userProgress.totalPoints}
                `;
                break;
            default:
                response.innerHTML = `<span class="text-red">命令未找到: ${command}</span>`;
        }

        outputElement.appendChild(response);
        outputElement.scrollTop = outputElement.scrollHeight;
    }
}

// 全局函数
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function openCourse(courseId) {
    window.cyberSecAcademy.openCourse(courseId);
}

function openLab(labId) {
    window.cyberSecAcademy.openLab(labId);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.cyberSecAcademy = new CyberSecAcademy();
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            // 可以添加搜索功能
        }
    });
});

// 数字雨效果（Matrix风格）
class MatrixRain {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.drops = [];
        this.chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()';
        
        this.initDrops();
        this.animate();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / 20);
    }
    
    initDrops() {
        this.drops = [];
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = 1;
        }
    }
    
    animate() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#00ff41';
        this.ctx.font = '15px monospace';
        
        for (let i = 0; i < this.drops.length; i++) {
            const char = this.chars[Math.floor(Math.random() * this.chars.length)];
            this.ctx.fillText(char, i * 20, this.drops[i] * 20);
            
            if (this.drops[i] * 20 > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }
        
        requestAnimationFrame(() => this.animate());
    }
}