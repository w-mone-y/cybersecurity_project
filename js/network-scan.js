// 网络扫描模拟器
class NetworkScanner {
    constructor() {
        this.isScanning = false;
        this.discoveredHosts = [];
        this.currentNetwork = '192.168.1.0/24';
        this.scanType = 'ping';
        this.portRange = 'common';
        this.scanSpeed = 3;
        this.scanInterval = null;
        this.canvas = null;
        this.ctx = null;
        this.networkNodes = [];
        this.selectedHost = null;
        
        // 预定义的服务端口
        this.commonPorts = {
            21: 'FTP',
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            80: 'HTTP',
            110: 'POP3',
            143: 'IMAP',
            443: 'HTTPS',
            993: 'IMAPS',
            995: 'POP3S',
            3389: 'RDP',
            5432: 'PostgreSQL',
            3306: 'MySQL',
            1521: 'Oracle',
            8080: 'HTTP-Alt',
            8443: 'HTTPS-Alt'
        };

        // 模拟主机数据
        this.simulatedHosts = this.generateSimulatedHosts();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initCanvas();
        this.updateNmapCommand();
    }

    setupEventListeners() {
        // 网络设置变化
        document.getElementById('target-network').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                document.getElementById('custom-network').style.display = 'block';
            } else {
                document.getElementById('custom-network').style.display = 'none';
                this.currentNetwork = e.target.value;
                this.updateNmapCommand();
            }
        });

        document.getElementById('custom-network-input').addEventListener('input', (e) => {
            this.currentNetwork = e.target.value;
            this.updateNmapCommand();
        });

        // 扫描类型变化
        document.getElementById('scan-type').addEventListener('change', (e) => {
            this.scanType = e.target.value;
            this.updateNmapCommand();
        });

        // 端口范围变化
        document.getElementById('port-range').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                document.getElementById('custom-ports').style.display = 'block';
            } else {
                document.getElementById('custom-ports').style.display = 'none';
                this.portRange = e.target.value;
                this.updateNmapCommand();
            }
        });

        document.getElementById('custom-ports-input').addEventListener('input', (e) => {
            this.portRange = e.target.value;
            this.updateNmapCommand();
        });

        // 扫描速度
        document.getElementById('scan-speed').addEventListener('input', (e) => {
            this.scanSpeed = parseInt(e.target.value);
            const speedTexts = ['很慢', '慢', '普通', '快', '很快'];
            document.getElementById('speed-display').textContent = speedTexts[this.scanSpeed - 1];
            this.updateNmapCommand();
        });

        // 按钮事件
        document.getElementById('start-scan').addEventListener('click', () => this.startScan());
        document.getElementById('stop-scan').addEventListener('click', () => this.stopScan());
        document.getElementById('clear-results').addEventListener('click', () => this.clearResults());

        // 模态框关闭事件
        document.querySelector('#host-modal .close').addEventListener('click', () => this.closeHostModal());
    }

    initCanvas() {
        this.canvas = document.getElementById('network-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.drawNetworkBackground();
    }

    drawNetworkBackground() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 清除画布
        ctx.clearRect(0, 0, width, height);

        // 绘制网格背景
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.1)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 绘制中心路由器
        ctx.fillStyle = '#00ff41';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('R', width / 2, height / 2 + 4);
    }

    generateSimulatedHosts() {
        const hosts = [];
        const baseIP = '192.168.1';
        
        // 生成一些模拟主机
        for (let i = 1; i <= 20; i++) {
            const isOnline = Math.random() > 0.3; // 70%在线概率
            if (isOnline) {
                hosts.push({
                    ip: `${baseIP}.${i}`,
                    mac: this.generateRandomMAC(),
                    hostname: this.generateHostname(i),
                    os: this.generateOS(),
                    ports: this.generateOpenPorts(),
                    services: this.generateServices()
                });
            }
        }
        
        return hosts;
    }

    generateRandomMAC() {
        const chars = '0123456789ABCDEF';
        let mac = '';
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 2 === 0) mac += ':';
            mac += chars[Math.floor(Math.random() * chars.length)];
        }
        return mac;
    }

    generateHostname(index) {
        const prefixes = ['PC', 'laptop', 'server', 'printer', 'phone', 'tablet', 'router'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        return `${prefix}-${index.toString().padStart(2, '0')}`;
    }

    generateOS() {
        const systems = ['Windows 10', 'Windows 11', 'Ubuntu 20.04', 'macOS', 'Android', 'iOS', 'CentOS'];
        return systems[Math.floor(Math.random() * systems.length)];
    }

    generateOpenPorts() {
        const possiblePorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 8080];
        const numPorts = Math.floor(Math.random() * 5) + 1;
        const ports = [];
        
        for (let i = 0; i < numPorts; i++) {
            const port = possiblePorts[Math.floor(Math.random() * possiblePorts.length)];
            if (!ports.includes(port)) {
                ports.push(port);
            }
        }
        
        return ports.sort((a, b) => a - b);
    }

    generateServices() {
        const services = [
            'Apache/2.4.41', 'nginx/1.18.0', 'OpenSSH 8.2', 'Microsoft IIS/10.0',
            'ProFTPD 1.3.6', 'Postfix smtpd', 'BIND 9.16.1', 'MySQL 8.0.25'
        ];
        const numServices = Math.floor(Math.random() * 3) + 1;
        return services.slice(0, numServices);
    }

    updateNmapCommand() {
        let command = 'nmap';
        
        // 添加扫描类型参数
        switch (this.scanType) {
            case 'ping':
                command += ' -sn';
                break;
            case 'tcp':
                command += ' -sT';
                break;
            case 'syn':
                command += ' -sS';
                break;
            case 'udp':
                command += ' -sU';
                break;
            case 'comprehensive':
                command += ' -A';
                break;
        }

        // 添加端口范围
        if (this.scanType !== 'ping') {
            switch (this.portRange) {
                case 'common':
                    command += ' -p 1-1024';
                    break;
                case 'all':
                    command += ' -p-';
                    break;
                case 'web':
                    command += ' -p 80,443,8080,8443';
                    break;
                case 'custom':
                    if (document.getElementById('custom-ports-input').value) {
                        command += ` -p ${document.getElementById('custom-ports-input').value}`;
                    }
                    break;
            }
        }

        // 添加速度参数
        command += ` -T${this.scanSpeed}`;
        
        // 添加目标网段
        command += ` ${this.currentNetwork}`;

        document.getElementById('nmap-command').textContent = command;
    }

    startScan() {
        this.isScanning = true;
        this.discoveredHosts = [];
        
        document.getElementById('start-scan').disabled = true;
        document.getElementById('stop-scan').disabled = false;
        
        this.addLogEntry('开始扫描网络...', 'info');
        this.addLogEntry(`目标网段: ${this.currentNetwork}`, 'info');
        this.addLogEntry(`扫描类型: ${this.getScanTypeName()}`, 'info');
        
        this.clearHostsList();
        this.clearNetworkNodes();
        this.resetStats();
        
        // 根据扫描速度设置间隔时间
        const intervals = [2000, 1500, 1000, 500, 200];
        const interval = intervals[this.scanSpeed - 1];
        
        this.scanNetwork(interval);
    }

    scanNetwork(interval) {
        let scannedCount = 0;
        const totalHosts = this.simulatedHosts.length;
        
        this.scanInterval = setInterval(() => {
            if (!this.isScanning || scannedCount >= totalHosts) {
                this.completeScan();
                return;
            }
            
            const host = this.simulatedHosts[scannedCount];
            this.scanHost(host);
            scannedCount++;
            
            // 更新统计
            document.getElementById('scanned-hosts').textContent = scannedCount;
            document.getElementById('scan-progress').textContent = 
                Math.round((scannedCount / totalHosts) * 100) + '%';
        }, interval);
    }

    scanHost(host) {
        // 模拟扫描延迟
        setTimeout(() => {
            if (!this.isScanning) return;
            
            this.discoveredHosts.push(host);
            this.addHostToList(host);
            this.addNetworkNode(host);
            this.addLogEntry(`发现主机: ${host.ip} (${host.hostname})`, 'success');
            
            // 更新活跃主机数
            document.getElementById('active-hosts').textContent = this.discoveredHosts.length;
            
            // 更新开放端口总数
            const totalOpenPorts = this.discoveredHosts.reduce((sum, h) => sum + h.ports.length, 0);
            document.getElementById('open-ports').textContent = totalOpenPorts;
        }, Math.random() * 500);
    }

    addHostToList(host) {
        const hostsList = document.getElementById('discovered-hosts');
        
        // 清除占位符
        if (hostsList.children[0].querySelector('.target-ip').textContent === '等待扫描...') {
            hostsList.innerHTML = '';
        }
        
        const hostElement = document.createElement('div');
        hostElement.className = 'target-item';
        hostElement.style.cursor = 'pointer';
        hostElement.innerHTML = `
            <div class="target-ip">${host.ip}</div>
            <div class="target-status status-online">在线</div>
        `;
        
        hostElement.addEventListener('click', () => this.selectHost(host));
        hostsList.appendChild(hostElement);
    }

    addNetworkNode(host) {
        const nodesContainer = document.getElementById('network-nodes');
        const canvas = document.getElementById('network-canvas');
        const rect = canvas.getBoundingClientRect();
        
        // 随机位置（避免中心路由器位置）
        let x, y;
        do {
            x = Math.random() * (canvas.width - 60) + 30;
            y = Math.random() * (canvas.height - 60) + 30;
        } while (Math.sqrt(Math.pow(x - canvas.width/2, 2) + Math.pow(y - canvas.height/2, 2)) < 50);
        
        const node = document.createElement('div');
        node.className = 'network-node';
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.textContent = host.ip.split('.').pop();
        node.title = `${host.ip} - ${host.hostname}`;
        
        node.addEventListener('click', () => this.selectHost(host));
        nodesContainer.appendChild(node);
        
        // 绘制连接线
        this.drawConnectionLine(canvas.width/2, canvas.height/2, x + 15, y + 15);
        
        this.networkNodes.push({element: node, host: host, x: x + 15, y: y + 15});
    }

    drawConnectionLine(x1, y1, x2, y2) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    selectHost(host) {
        this.selectedHost = host;
        this.showHostDetails(host);
        this.scanHostPorts(host);
    }

    showHostDetails(host) {
        document.getElementById('host-ip').textContent = host.ip;
        document.getElementById('host-mac').textContent = host.mac;
        document.getElementById('host-name').textContent = host.hostname;
        document.getElementById('host-os').textContent = host.os;
        
        // 显示端口信息
        const portsContainer = document.getElementById('host-ports');
        portsContainer.innerHTML = '';
        
        host.ports.forEach(port => {
            const portElement = document.createElement('div');
            portElement.innerHTML = `
                <span style="color: var(--primary-color); font-weight: bold;">${port}/tcp</span>
                <span style="color: var(--text-secondary);">${this.commonPorts[port] || 'unknown'}</span>
                <span style="color: var(--primary-color);">open</span>
            `;
            portsContainer.appendChild(portElement);
        });
        
        // 显示服务信息
        const servicesContainer = document.getElementById('host-services');
        servicesContainer.innerHTML = '';
        
        host.services.forEach(service => {
            const serviceElement = document.createElement('div');
            serviceElement.style.color = 'var(--text-secondary)';
            serviceElement.textContent = service;
            servicesContainer.appendChild(serviceElement);
        });
        
        document.getElementById('host-modal').style.display = 'block';
    }

    scanHostPorts(host) {
        const portsContainer = document.getElementById('port-results');
        portsContainer.innerHTML = '';
        
        const header = document.createElement('div');
        header.innerHTML = `<strong>端口扫描结果 - ${host.ip}</strong>`;
        header.style.marginBottom = '1rem';
        header.style.color = 'var(--primary-color)';
        portsContainer.appendChild(header);
        
        // 模拟端口扫描过程
        let portIndex = 0;
        const scanPortInterval = setInterval(() => {
            if (portIndex >= host.ports.length) {
                clearInterval(scanPortInterval);
                return;
            }
            
            const port = host.ports[portIndex];
            const portElement = document.createElement('div');
            portElement.className = 'port-item';
            portElement.innerHTML = `
                <div>
                    <span class="port-number">${port}/tcp</span>
                    <span class="port-service">${this.commonPorts[port] || 'unknown'}</span>
                </div>
                <span class="port-state-open">open</span>
            `;
            
            portsContainer.appendChild(portElement);
            portIndex++;
        }, 200);
    }

    completeScan() {
        clearInterval(this.scanInterval);
        this.isScanning = false;
        
        document.getElementById('start-scan').disabled = false;
        document.getElementById('stop-scan').disabled = true;
        document.getElementById('scan-progress').textContent = '100%';
        
        this.addLogEntry(`扫描完成！发现 ${this.discoveredHosts.length} 个活跃主机`, 'success');
        
        // 添加完成实验的积分
        if (window.cyberSecAcademy) {
            window.cyberSecAcademy.completeLab('network-scan', 60);
        }
    }

    stopScan() {
        this.isScanning = false;
        clearInterval(this.scanInterval);
        
        document.getElementById('start-scan').disabled = false;
        document.getElementById('stop-scan').disabled = true;
        
        this.addLogEntry('扫描已停止', 'warning');
    }

    clearResults() {
        this.discoveredHosts = [];
        this.networkNodes = [];
        this.selectedHost = null;
        
        this.clearHostsList();
        this.clearNetworkNodes();
        this.resetStats();
        this.drawNetworkBackground();
        
        document.getElementById('port-results').innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                选择一个主机开始端口扫描
            </div>
        `;
        
        this.addLogEntry('结果已清除', 'info');
    }

    clearHostsList() {
        const hostsList = document.getElementById('discovered-hosts');
        hostsList.innerHTML = `
            <div class="target-item">
                <div class="target-ip">等待扫描...</div>
                <div class="target-status status-unknown">未知</div>
            </div>
        `;
    }

    clearNetworkNodes() {
        document.getElementById('network-nodes').innerHTML = '';
    }

    resetStats() {
        document.getElementById('scanned-hosts').textContent = '0';
        document.getElementById('active-hosts').textContent = '0';
        document.getElementById('open-ports').textContent = '0';
        document.getElementById('scan-progress').textContent = '0%';
    }

    getScanTypeName() {
        const types = {
            'ping': 'Ping扫描',
            'tcp': 'TCP连接扫描',
            'syn': 'SYN隐蔽扫描',
            'udp': 'UDP扫描',
            'comprehensive': '综合扫描'
        };
        return types[this.scanType] || '未知';
    }

    addLogEntry(message, type = 'info') {
        const logContent = document.getElementById('scan-log');
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
    }

    closeHostModal() {
        document.getElementById('host-modal').style.display = 'none';
    }
}

// 全局函数
function goHome() {
    window.location.href = '../index.html';
}

function scanHostPorts() {
    if (scanner.selectedHost) {
        scanner.addLogEntry(`开始深度端口扫描: ${scanner.selectedHost.ip}`, 'info');
        scanner.scanHostPorts(scanner.selectedHost);
    }
}

function closeHostModal() {
    scanner.closeHostModal();
}

// 初始化网络扫描器
let scanner;
document.addEventListener('DOMContentLoaded', () => {
    scanner = new NetworkScanner();
});