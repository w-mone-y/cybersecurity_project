# 🛡️ CyberSec Learning Platform

A comprehensive, interactive cybersecurity learning platform designed to provide hands-on experience with various security concepts and techniques.

## 🎯 Features

### 🏠 Main Platform
- **Modern responsive design** with dark theme and animated elements
- **Interactive navigation** with smooth scrolling
- **Particle background effects** for enhanced visual experience
- **Progress tracking** with achievements and notifications

### 🧪 Interactive Labs & Exercises

#### 🔓 Password Cracking Lab
- Multiple attack modes: Dictionary, Brute Force, and Hybrid attacks
- Real-time progress visualization
- Educational tips and security best practices
- Adjustable password complexity parameters

#### 🌐 Network Scan Simulator
- Visual network topology representation
- Configurable scan types and parameters
- Host discovery and port scanning simulation
- Detailed scan results and analysis

#### 🔐 Cryptography Challenge Game
- Classic cipher challenges (Caesar, Vigenère, Morse, Atbash)
- Interactive encryption/decryption tools
- Scoring system with streak tracking
- Frequency analysis visualization
- Progressive difficulty levels

#### 💉 SQL Injection Demo Environment
- Safe, simulated banking interface
- Pre-built and custom SQL injection payloads
- Real-time query visualization
- Educational secure coding practices

### 🚀 Backend Features
- **User Authentication**: Registration, login, email verification, password reset
- **JWT-based Security**: Protected API endpoints with refresh tokens
- **Comment System**: Course discussions with replies, likes, and moderation
- **Real-time Features**: WebSocket notifications and live chat
- **AI Assistant**: Integrated DeepSeek AI for interactive learning support

## 🛠️ Tech Stack

### Frontend
- **HTML5/CSS3** with modern animations and transitions
- **Vanilla JavaScript** for interactivity and dynamic content
- **Canvas API** for network visualization
- **WebSocket** for real-time features

### Backend
- **Node.js** with Express framework
- **MongoDB** for data persistence
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Nodemailer** for email services
- **DeepSeek AI** integration

## 📁 Project Structure

```
cybersec-learning-platform/
├── 📄 index.html                 # Main landing page
├── 📁 css/                       # Stylesheets
├── 📁 js/                        # Frontend JavaScript
├── 📁 exercises/                 # Interactive lab modules
│   ├── password-cracking/
│   ├── network-scanner/
│   ├── crypto-challenges/
│   └── sql-injection/
├── 📁 pages/                     # Additional pages
├── 📁 backend/                   # Server-side code
│   ├── routes/                   # API endpoints
│   ├── models/                   # Database models
│   ├── middleware/               # Authentication & validation
│   └── utils/                    # Helper functions
└── 📁 i18n/                      # Internationalization
```

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cybersec-learning-platform.git
   cd cybersec-learning-platform
   ```

2. **Set up the frontend**
   ```bash
   # Serve the frontend (simple HTTP server)
   python3 -m http.server 8000
   # Or use the provided script
   ./run.sh
   ```

3. **Set up the backend**
   ```bash
   cd backend
   npm install
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env with your configurations
   
   npm start
   ```

4. **Access the platform**
   - Frontend: http://localhost:8000
   - Backend API: http://localhost:3001

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/cybersec-platform

# JWT Secrets
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AI Integration
DEEPSEEK_API_KEY=your-deepseek-api-key

# Server Configuration
PORT=3001
NODE_ENV=production
```

## 🎯 Learning Objectives

This platform helps users understand:
- **Password Security**: Common attack methods and defense strategies
- **Network Security**: Host discovery, port scanning, and network reconnaissance
- **Cryptography**: Classical ciphers and cryptanalysis techniques
- **Web Security**: SQL injection vulnerabilities and prevention
- **Security Awareness**: Best practices and secure coding principles

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- Educational content inspired by industry best practices
- UI design elements from modern cybersecurity tools
- Community feedback and contributions

## 📞 Support

For questions or support, please open an issue on GitHub or contact the maintainers.

---

**⚠️ Disclaimer**: This platform is designed for educational purposes only. Please use the knowledge gained responsibly and ethically.