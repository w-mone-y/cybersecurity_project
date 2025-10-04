// 加密解密挑战游戏
class CryptoChallengeGame {
    constructor() {
        this.currentChallenge = null;
        this.currentCipher = 'caesar';
        this.gameStats = {
            challengesSolved: 0,
            totalScore: 0,
            currentStreak: 0,
            hintsUsed: 0
        };
        
        // 挑战数据库
        this.challenges = {
            caesar: [
                {
                    title: '凯撒密码挑战 - 基础',
                    description: '破解这段使用凯撒密码加密的文本，移位为3。',
                    cipherText: 'KHOOR ZRUOG',
                    answer: 'HELLO WORLD',
                    hint: '每个字母向前移动3位：D→A, E→B, F→C...',
                    difficulty: 1,
                    points: 100
                },
                {
                    title: '凯撒密码挑战 - 进阶',
                    description: '这次的移位数是未知的，你需要找出正确的移位数。',
                    cipherText: 'WKH TXLFN EURZQ IRA',
                    answer: 'THE QUICK BROWN FOX',
                    hint: '试试不同的移位数，或使用频率分析。',
                    difficulty: 2,
                    points: 150
                }
            ],
            vigenere: [
                {
                    title: '维吉尼亚密码挑战',
                    description: '使用关键词"KEY"破解这段维吉尼亚密码。',
                    cipherText: 'RIJVSUYVJN',
                    answer: 'HELLOWORLD',
                    hint: '使用关键词KEY重复加密：H+K=R, E+E=I, L+Y=J...',
                    difficulty: 3,
                    points: 200
                }
            ],
            morse: [
                {
                    title: '摩尔斯电码挑战',
                    description: '将下面的摩尔斯电码翻译成英文。',
                    cipherText: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
                    answer: 'HELLO WORLD',
                    hint: '点(.)表示短信号，划(-)表示长信号。字母之间用空格分隔。',
                    difficulty: 1,
                    points: 120
                }
            ],
            atbash: [
                {
                    title: '阿特巴什密码挑战',
                    description: '破解这段阿特巴什密码（A=Z, B=Y, C=X...）。',
                    cipherText: 'SVOOL DLIOW',
                    answer: 'HELLO WORLD',
                    hint: '字母表反向替换：A↔Z, B↔Y, C↔X, D↔W, E↔V...',
                    difficulty: 1,
                    points: 110
                }
            ]
        };
        
        // 摩尔斯电码映射
        this.morseCode = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
            'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
            'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
            'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
            'Y': '-.--', 'Z': '--..', ' ': '/'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadGameStats();
        this.updateDisplay();
        this.setupCipherSelector();
    }

    setupEventListeners() {
        // 密码选择器事件
        document.querySelectorAll('.cipher-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectCipher(e.target.dataset.cipher);
            });
        });
        
        // 加载游戏统计
        this.loadGameStats();
    }

    setupCipherSelector() {
        document.querySelectorAll('.cipher-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 更新选中状态
                document.querySelectorAll('.cipher-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // 切换密码类型
                this.currentCipher = e.target.dataset.cipher;
                this.showCipherDemo(this.currentCipher);
                this.updateKeyInputVisibility();
            });
        });
    }

    selectCipher(cipherType) {
        this.currentCipher = cipherType;
        this.showCipherDemo(cipherType);
        this.updateKeyInputVisibility();
    }

    showCipherDemo(cipherType) {
        // 隐藏所有演示
        document.querySelectorAll('.cipher-demo').forEach(demo => {
            demo.classList.remove('active');
        });
        
        // 显示选中的演示
        const demo = document.getElementById(`${cipherType}-demo`);
        if (demo) {
            demo.classList.add('active');
        }
    }

    updateKeyInputVisibility() {
        const needsKey = ['vigenere'].includes(this.currentCipher);
        const encryptKey = document.getElementById('encrypt-key');
        const decryptKey = document.getElementById('decrypt-key');
        
        if (needsKey) {
            encryptKey.style.display = 'block';
            decryptKey.style.display = 'block';
        } else {
            encryptKey.style.display = 'none';
            decryptKey.style.display = 'none';
        }
    }

    loadRandomChallenge() {
        const cipherTypes = Object.keys(this.challenges);
        const randomType = cipherTypes[Math.floor(Math.random() * cipherTypes.length)];
        const challenges = this.challenges[randomType];
        const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
        
        this.loadChallenge(randomChallenge);
    }

    loadSpecificChallenge(cipherType) {
        if (!this.challenges[cipherType]) return;
        
        const challenges = this.challenges[cipherType];
        const challenge = challenges[Math.floor(Math.random() * challenges.length)];
        
        this.loadChallenge(challenge);
    }

    loadChallenge(challenge) {
        this.currentChallenge = challenge;
        
        document.getElementById('challenge-title').textContent = challenge.title;
        document.getElementById('challenge-description').textContent = challenge.description;
        document.getElementById('challenge-cipher').textContent = challenge.cipherText;
        document.getElementById('answer-input').value = '';
        document.getElementById('hint-section').classList.remove('show');
    }

    checkAnswer() {
        if (!this.currentChallenge) {
            this.showNotification('请先选择一个挑战！', 'error');
            return;
        }
        
        const userAnswer = document.getElementById('answer-input').value.trim().toUpperCase();
        const correctAnswer = this.currentChallenge.answer.toUpperCase();
        
        if (userAnswer === correctAnswer) {
            // 正确答案
            this.gameStats.challengesSolved++;
            this.gameStats.totalScore += this.currentChallenge.points;
            this.gameStats.currentStreak++;
            
            this.saveGameStats();
            this.updateDisplay();
            
            this.showNotification(`正确！获得 ${this.currentChallenge.points} 积分！`, 'success');
            
            // 自动加载下一个挑战
            setTimeout(() => {
                this.loadRandomChallenge();
            }, 2000);
            
            // 添加到用户进度
            if (window.cyberSecAcademy) {
                window.cyberSecAcademy.completeLab('crypto-challenge', this.currentChallenge.points);
            }
        } else {
            // 错误答案
            this.gameStats.currentStreak = 0;
            this.showNotification('答案不正确，再试一次！', 'error');
        }
    }

    showHint() {
        if (!this.currentChallenge) return;
        
        this.gameStats.hintsUsed++;
        this.saveGameStats();
        this.updateDisplay();
        
        document.getElementById('hint-content').textContent = this.currentChallenge.hint;
        document.getElementById('hint-section').classList.add('show');
        
        this.showNotification('提示已显示', 'info');
    }

    skipChallenge() {
        if (!this.currentChallenge) return;
        
        this.gameStats.currentStreak = 0;
        this.loadRandomChallenge();
        this.showNotification('已跳过当前挑战', 'info');
    }

    // 加密解密工具函数
    encryptText() {
        const plaintext = document.getElementById('encrypt-input').value;
        const key = document.getElementById('encrypt-key').value;
        
        if (!plaintext) {
            this.showNotification('请输入要加密的文本', 'error');
            return;
        }
        
        let encrypted = '';
        
        try {
            switch (this.currentCipher) {
                case 'caesar':
                    const shift = parseInt(key) || 3;
                    encrypted = this.caesarCipher(plaintext, shift);
                    break;
                case 'vigenere':
                    if (!key) {
                        this.showNotification('维吉尼亚密码需要密钥', 'error');
                        return;
                    }
                    encrypted = this.vigenereCipher(plaintext, key, true);
                    break;
                case 'atbash':
                    encrypted = this.atbashCipher(plaintext);
                    break;
                case 'morse':
                    encrypted = this.morseEncode(plaintext);
                    break;
                case 'base64':
                    encrypted = btoa(plaintext);
                    break;
                case 'rot13':
                    encrypted = this.caesarCipher(plaintext, 13);
                    break;
                default:
                    this.showNotification('未实现的加密算法', 'error');
                    return;
            }
            
            // 将结果复制到解密输入框
            document.getElementById('decrypt-input').value = encrypted;
            this.showNotification('加密完成！', 'success');
            
        } catch (error) {
            this.showNotification('加密过程中出错：' + error.message, 'error');
        }
    }

    decryptText() {
        const ciphertext = document.getElementById('decrypt-input').value;
        const key = document.getElementById('decrypt-key').value;
        
        if (!ciphertext) {
            this.showNotification('请输入要解密的文本', 'error');
            return;
        }
        
        let decrypted = '';
        
        try {
            switch (this.currentCipher) {
                case 'caesar':
                    const shift = parseInt(key) || 3;
                    decrypted = this.caesarCipher(ciphertext, -shift);
                    break;
                case 'vigenere':
                    if (!key) {
                        this.showNotification('维吉尼亚密码需要密钥', 'error');
                        return;
                    }
                    decrypted = this.vigenereCipher(ciphertext, key, false);
                    break;
                case 'atbash':
                    decrypted = this.atbashCipher(ciphertext);
                    break;
                case 'morse':
                    decrypted = this.morseDecode(ciphertext);
                    break;
                case 'base64':
                    decrypted = atob(ciphertext);
                    break;
                case 'rot13':
                    decrypted = this.caesarCipher(ciphertext, -13);
                    break;
                default:
                    this.showNotification('未实现的解密算法', 'error');
                    return;
            }
            
            // 将结果显示到加密输入框
            document.getElementById('encrypt-input').value = decrypted;
            this.showNotification('解密完成！', 'success');
            
        } catch (error) {
            this.showNotification('解密过程中出错：' + error.message, 'error');
        }
    }

    // 凯撒密码
    caesarCipher(text, shift) {
        return text.replace(/[A-Za-z]/g, char => {
            const start = char <= 'Z' ? 65 : 97;
            return String.fromCharCode(((char.charCodeAt(0) - start + shift + 26) % 26) + start);
        });
    }

    // 维吉尼亚密码
    vigenereCipher(text, key, encrypt = true) {
        const keyUpper = key.toUpperCase();
        let keyIndex = 0;
        
        return text.replace(/[A-Za-z]/g, char => {
            const isUpper = char <= 'Z';
            const start = isUpper ? 65 : 97;
            const textChar = char.charCodeAt(0) - start;
            const keyChar = keyUpper.charCodeAt(keyIndex % keyUpper.length) - 65;
            
            keyIndex++;
            
            const shift = encrypt ? keyChar : -keyChar;
            return String.fromCharCode(((textChar + shift + 26) % 26) + start);
        });
    }

    // 阿特巴什密码
    atbashCipher(text) {
        return text.replace(/[A-Za-z]/g, char => {
            if (char <= 'Z') {
                return String.fromCharCode(90 - (char.charCodeAt(0) - 65));
            } else {
                return String.fromCharCode(122 - (char.charCodeAt(0) - 97));
            }
        });
    }

    // 摩尔斯电码编码
    morseEncode(text) {
        return text.toUpperCase().split('').map(char => {
            return this.morseCode[char] || char;
        }).join(' ');
    }

    // 摩尔斯电码解码
    morseDecode(morse) {
        const reverseCode = Object.fromEntries(
            Object.entries(this.morseCode).map(([k, v]) => [v, k])
        );
        
        return morse.split(' ').map(code => {
            return reverseCode[code] || code;
        }).join('');
    }

    // 频率分析
    analyzeFrequency() {
        const text = document.getElementById('decrypt-input').value.toUpperCase();
        if (!text) {
            this.showNotification('请输入要分析的文本', 'error');
            return;
        }
        
        // 统计字母频率
        const frequency = {};
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // 初始化
        letters.split('').forEach(letter => {
            frequency[letter] = 0;
        });
        
        // 计算频率
        let totalLetters = 0;
        text.split('').forEach(char => {
            if (letters.includes(char)) {
                frequency[char]++;
                totalLetters++;
            }
        });
        
        // 转换为百分比
        Object.keys(frequency).forEach(letter => {
            frequency[letter] = (frequency[letter] / totalLetters) * 100;
        });
        
        this.displayFrequencyChart(frequency);
    }

    displayFrequencyChart(frequency) {
        const chartContainer = document.getElementById('frequency-chart');
        chartContainer.innerHTML = '';
        
        const maxFreq = Math.max(...Object.values(frequency));
        
        Object.entries(frequency).forEach(([letter, freq]) => {
            const bar = document.createElement('div');
            bar.className = 'frequency-bar';
            bar.style.height = `${(freq / maxFreq) * 80}px`;
            
            const label = document.createElement('div');
            label.className = 'frequency-label';
            label.textContent = letter;
            
            bar.appendChild(label);
            bar.title = `${letter}: ${freq.toFixed(1)}%`;
            
            chartContainer.appendChild(bar);
        });
    }

    // 游戏统计
    loadGameStats() {
        const saved = localStorage.getItem('cryptoChallengeStats');
        if (saved) {
            this.gameStats = {...this.gameStats, ...JSON.parse(saved)};
        }
    }

    saveGameStats() {
        localStorage.setItem('cryptoChallengeStats', JSON.stringify(this.gameStats));
    }

    updateDisplay() {
        document.getElementById('challenges-solved').textContent = this.gameStats.challengesSolved;
        document.getElementById('total-score').textContent = this.gameStats.totalScore;
        document.getElementById('current-streak').textContent = this.gameStats.currentStreak;
        document.getElementById('hints-used').textContent = this.gameStats.hintsUsed;
        document.getElementById('player-score').textContent = this.gameStats.totalScore;
    }

    showNotification(message, type = 'info') {
        // 使用主系统的通知功能
        if (window.cyberSecAcademy) {
            window.cyberSecAcademy.showNotification(message, type);
        } else {
            // 备用通知
            alert(message);
        }
    }
}

// 全局函数
function goHome() {
    window.location.href = '../index.html';
}

function loadRandomChallenge() {
    cryptoGame.loadRandomChallenge();
}

function loadSpecificChallenge(type) {
    cryptoGame.loadSpecificChallenge(type);
}

function checkAnswer() {
    cryptoGame.checkAnswer();
}

function showHint() {
    cryptoGame.showHint();
}

function skipChallenge() {
    cryptoGame.skipChallenge();
}

function encryptText() {
    cryptoGame.encryptText();
}

function decryptText() {
    cryptoGame.decryptText();
}

function analyzeFrequency() {
    cryptoGame.analyzeFrequency();
}

// 初始化游戏
let cryptoGame;
document.addEventListener('DOMContentLoaded', () => {
    cryptoGame = new CryptoChallengeGame();
});