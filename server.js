const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 邮件配置 - 使用QQ邮箱SMTP
// 注意：需要在QQ邮箱中开启SMTP服务并获取授权码
const EMAIL_CONFIG = {
    service: 'qq',
    auth: {
        user: '853865545@qq.com', // 发送邮件的QQ邮箱
        pass: 'tbizjmaukbstbcdf' // 需要替换为您的QQ邮箱授权码
    }
};

// 创建邮件传输器
let transporter;

async function initTransporter() {
    try {
        transporter = nodemailer.createTransport({
            host: 'smtp.qq.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: EMAIL_CONFIG.auth.user,
                pass: EMAIL_CONFIG.auth.pass
            },
            debug: true // 启用调试模式
        });
        
        // 验证邮件配置
        const success = await transporter.verify();
        if (success) {
            console.log('✓ 邮件配置验证成功，可以发送邮件');
        }
    } catch (error) {
        console.error('✗ 创建邮件传输器失败:', error.message);
        console.error('  请检查：1. QQ邮箱SMTP服务是否开启 2. 授权码是否正确');
    }
}

// 发送邮件API
app.post('/api/send-email', async (req, res) => {
    console.log('收到邮件发送请求:', new Date().toLocaleString());
    
    // 检查传输器是否就绪
    if (!transporter) {
        console.error('✗ 邮件传输器未初始化');
        return res.status(500).json({ 
            success: false, 
            message: '邮件服务未就绪，请检查后端服务日志' 
        });
    }
    
    try {
        const { projects, to, subject } = req.body;
        
        console.log('项目列表:', projects);
        console.log('收件人:', to);
        console.log('主题:', subject);
        
        if (!projects || projects.length === 0) {
            return res.status(400).json({ success: false, message: '没有需要提醒的项目' });
        }
        
        // 构建邮件正文
        let body = '以下项目即将到期，请尽快完成报送！\n\n';
        projects.forEach((project, index) => {
            const deadline = formatDateForEmail(project.deadline);
            body += `${index + 1}. ${project.name}（${project.type}）\n   截止日期：${deadline}\n\n`;
        });
        body += '请及时处理，谢谢！';
        
        // 邮件选项
        const mailOptions = {
            from: `"底稿报送提醒" <${EMAIL_CONFIG.auth.user}>`,
            to: to || EMAIL_CONFIG.auth.user,
            subject: subject || '底稿报送有项目快到期啦！',
            text: body,
            html: body.replace(/\n/g, '<br>')
        };
        
        console.log('准备发送邮件...');
        
        // 发送邮件
        const info = await transporter.sendMail(mailOptions);
        console.log('✓ 邮件发送成功! Message ID:', info.messageId);
        console.log('  收件人:', info.accepted);
        
        res.json({ 
            success: true, 
            message: '邮件发送成功',
            messageId: info.messageId,
            accepted: info.accepted
        });
        
    } catch (error) {
        console.error('✗ 邮件发送失败:', error.message);
        console.error('  错误详情:', error);
        
        let errorMsg = '邮件发送失败';
        if (error.code === 'EAUTH') {
            errorMsg = '邮件认证失败，请检查QQ邮箱授权码是否正确';
        } else if (error.code === 'ETIMEDOUT') {
            errorMsg = '邮件服务器连接超时，请检查网络连接';
        } else if (error.response) {
            errorMsg = `邮件服务器返回错误: ${error.response}`;
        }
        
        res.status(500).json({ 
            success: false, 
            message: errorMsg,
            errorCode: error.code,
            details: error.message
        });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: transporter ? 'ok' : 'warning', 
        timestamp: new Date().toISOString(),
        transporterReady: !!transporter
    });
});

// 测试邮件发送
app.post('/api/test-email', async (req, res) => {
    console.log('收到测试邮件请求');
    
    if (!transporter) {
        return res.status(500).json({ success: false, message: '邮件传输器未初始化' });
    }
    
    try {
        const mailOptions = {
            from: `"测试" <${EMAIL_CONFIG.auth.user}>`,
            to: EMAIL_CONFIG.auth.user,
            subject: '测试邮件 - 底稿报送提醒',
            text: '这是一封测试邮件，说明邮件发送功能正常！',
            html: '<p>这是一封测试邮件，说明邮件发送功能正常！</p>'
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('测试邮件发送成功:', info.messageId);
        
        res.json({ 
            success: true, 
            message: '测试邮件发送成功，请检查您的邮箱',
            messageId: info.messageId
        });
    } catch (error) {
        console.error('测试邮件发送失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '测试邮件发送失败: ' + error.message 
        });
    }
});

// 格式化日期
function formatDateForEmail(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// 启动服务器
async function startServer() {
    await initTransporter();
    app.listen(PORT, () => {
        console.log('==========================================');
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log('==========================================');
        console.log('服务端点:');
        console.log('  - POST /api/send-email    发送邮件提醒');
        console.log('  - POST /api/test-email    发送测试邮件');
        console.log('  - GET  /api/health        健康检查');
        console.log('==========================================');
        console.log('请确保已在QQ邮箱中开启SMTP服务并设置正确的授权码');
    });
}

startServer();
