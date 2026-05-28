// 合同记录数组
let contracts = [];

// 当前视图模式：'accept' 受理日视图，'issue' 发行日视图
let currentView = 'accept';

// DOM元素
const contractName = document.getElementById('contractName');
const contactPerson = document.getElementById('contactPerson');
const dateType = document.getElementById('dateType');
const projectDate = document.getElementById('projectDate');
const addBtn = document.getElementById('addBtn');
const ganttBody = document.getElementById('ganttBody');
const calendarGrid = document.getElementById('calendarGrid');
const totalCount = document.getElementById('totalCount');
const warningCount = document.getElementById('warningCount');
const dangerCount = document.getElementById('dangerCount');
const safeCount = document.getElementById('safeCount');
const acceptTab = document.getElementById('acceptTab');
const issueTab = document.getElementById('issueTab');

// 分页相关元素
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageSize = 10; // 每页显示10条
let currentPage = 1;

// Excel导入相关元素
const excelFile = document.getElementById('excelFile');
const importBtn = document.getElementById('importBtn');
const fileInfo = document.getElementById('fileInfo');
let selectedFile = null;

// 邮件配置
const EMAIL_CONFIG = {
    to: '853865545@qq.com',
    subject: '底稿报送有项目快到期啦！',
    sendTimeKey: 'lastEmailSendDate'
};

// 初始化
function init() {
    addBtn.addEventListener('click', addContract);
    
    // Excel导入事件
    excelFile.addEventListener('change', handleFileSelect);
    importBtn.addEventListener('click', importExcelData);
    
    // 设置默认日期为今天
    const today = new Date();
    projectDate.value = today.toISOString().split('T')[0];
    
    // 加载本地存储的记录
    loadContracts();
    
    // 更新日历
    updateCalendar();
    
    // 检查到期项目并发送邮件提醒
    checkAndSendExpirationReminder();
}

// 检查到期项目并发送邮件提醒
function checkAndSendExpirationReminder() {
    const today = formatDate(new Date());
    const lastSendDate = localStorage.getItem(EMAIL_CONFIG.sendTimeKey);
    
    // 如果今天已经发送过邮件，不再重复发送
    if (lastSendDate === today) {
        console.log('今日邮件提醒已发送');
        return;
    }
    
    // 查找今天到期的项目（40天到期）
    const expiringProjects = [];
    
    contracts.forEach(contract => {
        // 检查受理日期40天到期
        if (contract.acceptDate40 === today) {
            expiringProjects.push({
                name: contract.name,
                deadline: contract.acceptDate45,
                type: '受理日期'
            });
        }
        
        // 检查发行日期40天到期（如果有）
        if (contract.issueDate40 && contract.issueDate40 === today) {
            expiringProjects.push({
                name: contract.name,
                deadline: contract.issueDate45,
                type: '发行日期'
            });
        }
    });
    
    // 如果有到期项目，发送邮件提醒
    if (expiringProjects.length > 0) {
        sendExpirationEmail(expiringProjects);
        // 记录发送日期，避免重复发送
        localStorage.setItem(EMAIL_CONFIG.sendTimeKey, today);
    }
}

// 发送到期提醒邮件
function sendExpirationEmail(projects) {
    let body = '以下项目即将到期，请尽快完成报送！\n\n';
    
    projects.forEach((project, index) => {
        const deadline = formatDateForEmail(project.deadline);
        body += `${index + 1}. ${project.name}（${project.type}）\n   截止日期：${deadline}\n\n`;
    });
    
    body += '请及时处理，谢谢！';
    
    // 使用mailto协议打开邮件客户端
    const mailtoUrl = `mailto:${EMAIL_CONFIG.to}?subject=${encodeURIComponent(EMAIL_CONFIG.subject)}&body=${encodeURIComponent(body)}`;
    
    // 提示用户确认发送邮件
    if (confirm(`检测到 ${projects.length} 个项目即将到期，是否发送邮件提醒？`)) {
        window.location.href = mailtoUrl;
    }
}

// 格式化日期用于邮件显示
function formatDateForEmail(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}年${month}月${day}日`;
}

// 计算工作日后的日期
function addWorkDays(startDate, days) {
    const date = new Date(startDate);
    let workDaysAdded = 0;
    
    while (workDaysAdded < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        // 排除周六和周日
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDaysAdded++;
        }
    }
    
    return date;
}

// 格式化日期
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取日期天数差（自然日）
function getDaysDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 获取工作日天数差
function getWorkDaysDiff(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
        const dayOfWeek = current.getDay();
        // 排除周六和周日
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDays++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return workDays;
}

// 获取状态（考虑受理日期和发行日期两个日期点）
function getStatus(contract) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 受理日期的提醒
    const acceptDate40 = new Date(contract.acceptDate40);
    const acceptDate45 = new Date(contract.acceptDate45);
    
    // 发行日期的提醒（如果有）
    let hasIssueDate = contract.issueDate && contract.issueDate !== '';
    const issueDate40 = hasIssueDate ? new Date(contract.issueDate40) : null;
    const issueDate45 = hasIssueDate ? new Date(contract.issueDate45) : null;
    
    // 检查是否有任何日期超45天
    if (today > acceptDate45 || (hasIssueDate && today > issueDate45)) {
        return 'danger'; // 已超45天
    }
    
    // 检查是否有任何日期超40天
    if (today > acceptDate40 || (hasIssueDate && today > issueDate40)) {
        return 'warning'; // 已超40天，未超45天
    }
    
    return 'safe'; // 正常
}

// 获取状态文本
function getStatusText(contract) {
    const status = getStatus(contract);
    switch(status) {
        case 'danger': return '已超期';
        case 'warning': return '即将到期';
        case 'safe': return '正常';
    }
}

// 获取进度百分比（基于工作日计算）
function getProgress(contract) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reply = new Date(contract.replyDate);
    const date45 = new Date(contract.acceptDate45);
    
    // 使用工作日计算进度
    const totalWorkDays = 45; // 总工作日数
    const elapsedWorkDays = getWorkDaysDiff(reply, today);
    
    if (elapsedWorkDays <= 0) return 0;
    if (elapsedWorkDays >= totalWorkDays) return 100;
    
    return Math.round((elapsedWorkDays / totalWorkDays) * 100);
}

// 添加项目
function addContract() {
    const name = contractName.value.trim();
    const contact = contactPerson.value.trim();
    const selectedDateType = dateType.value;
    const date = projectDate.value.trim();
    
    if (!name) {
        alert('请输入项目名称');
        return;
    }
    
    if (!date) {
        alert('请选择日期');
        return;
    }
    
    // 计算提醒日期
    const date40 = formatDate(addWorkDays(date, 40));
    const date45 = formatDate(addWorkDays(date, 45));
    
    // 根据选择的日期类型创建项目
    const contract = {
        id: Date.now(),
        name: name,
        contactPerson: contact || '',
        replyDate: selectedDateType === 'accept' ? date : '',
        acceptDate40: selectedDateType === 'accept' ? date40 : '',
        acceptDate45: selectedDateType === 'accept' ? date45 : '',
        issueDate: selectedDateType === 'issue' ? date : '',
        issueDate40: selectedDateType === 'issue' ? date40 : '',
        issueDate45: selectedDateType === 'issue' ? date45 : ''
    };
    
    contracts.push(contract);
    updateTable();
    updateCalendar();
    saveContracts();
    
    // 清空输入
    contractName.value = '';
    contactPerson.value = '';
    projectDate.value = '';
}

// 删除项目
function deleteContract(id) {
    if (confirm('确定要删除这条项目记录吗？')) {
        contracts = contracts.filter(c => c.id !== id);
        updateTable();
        updateCalendar();
        saveContracts();
    }
}

// 获取项目最早截止日期
function getEarliestDeadline(contract) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let earliestDate = new Date(contract.acceptDate45 || contract.date45);
    
    // 如果有发行日期且更早，使用发行日期的截止
    if (contract.issueDate45 && contract.issueDate45 !== '') {
        const issueDeadline = new Date(contract.issueDate45);
        if (issueDeadline < earliestDate) {
            earliestDate = issueDeadline;
        }
    }
    
    return earliestDate;
}

// 获取指定视图的截止日期
function getDeadlineByView(contract, view) {
    if (view === 'accept') {
        return new Date(contract.acceptDate45);
    } else {
        return new Date(contract.issueDate45);
    }
}

// 获取指定视图的状态
function getStatusByView(contract, view) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (view === 'accept') {
        const date40 = new Date(contract.acceptDate40);
        const date45 = new Date(contract.acceptDate45);
        
        if (today > date45) return 'danger';
        if (today > date40) return 'warning';
        return 'safe';
    } else {
        // 发行日视图，没有发行日期的项目不显示
        if (!contract.issueDate || contract.issueDate === '') return null;
        
        const date40 = new Date(contract.issueDate40);
        const date45 = new Date(contract.issueDate45);
        
        if (today > date45) return 'danger';
        if (today > date40) return 'warning';
        return 'safe';
    }
}

// 获取指定视图的进度
function getProgressByView(contract, view) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, deadline;
    if (view === 'accept') {
        startDate = new Date(contract.replyDate);
        deadline = new Date(contract.acceptDate45);
    } else {
        if (!contract.issueDate || contract.issueDate === '') return 0;
        startDate = new Date(contract.issueDate);
        deadline = new Date(contract.issueDate45);
    }
    
    const totalWorkDays = 45;
    const elapsedWorkDays = getWorkDaysDiff(startDate, today);
    
    if (elapsedWorkDays <= 0) return 0;
    if (elapsedWorkDays >= totalWorkDays) return 100;
    
    return Math.round((elapsedWorkDays / totalWorkDays) * 100);
}

// 获取倒计时天数
function getCountdown(contract, view) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let deadline;
    if (view === 'accept') {
        deadline = new Date(contract.acceptDate45);
    } else {
        if (!contract.issueDate || contract.issueDate === '') return '-';
        deadline = new Date(contract.issueDate45);
    }
    
    const diffDays = getWorkDaysDiff(today, deadline);
    return diffDays;
}

// 更新表格
function updateTable() {
    // 根据当前视图筛选项目
    let filteredContracts = contracts;
    if (currentView === 'issue') {
        filteredContracts = contracts.filter(c => c.issueDate && c.issueDate !== '');
    }
    
    if (filteredContracts.length === 0) {
        const emptyMsg = currentView === 'issue' ? '暂无发行日期记录，请添加项目' : '暂无项目记录，请添加新项目';
        ganttBody.innerHTML = `<tr><td colspan="10" class="empty">${emptyMsg}</td></tr>`;
        pagination.style.display = 'none';
        updateStats();
        return;
    }

    // 按当前视图的截止日期排序（越靠近截止日期越靠前）
    filteredContracts.sort((a, b) => {
        const deadlineA = getDeadlineByView(a, currentView);
        const deadlineB = getDeadlineByView(b, currentView);
        return deadlineA - deadlineB;
    });

    // 计算分页
    const totalPages = Math.ceil(filteredContracts.length / pageSize);
    currentPage = Math.min(currentPage, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedContracts = filteredContracts.slice(startIndex, endIndex);

    let html = '';
    paginatedContracts.forEach((contract, index) => {
        const actualIndex = startIndex + index;
        const status = getStatusByView(contract, currentView);
        const progress = getProgressByView(contract, currentView);
        const countdown = getCountdown(contract, currentView);
        
        // 获取当前视图的日期字段
        const baseDate = currentView === 'accept' ? contract.replyDate : contract.issueDate;
        const date40 = currentView === 'accept' ? contract.acceptDate40 : contract.issueDate40;
        const date45 = currentView === 'accept' ? contract.acceptDate45 : contract.issueDate45;
        
        // 倒计时样式
        let countdownClass = 'countdown-normal';
        if (countdown <= 0) countdownClass = 'countdown-danger';
        else if (countdown <= 5) countdownClass = 'countdown-warning';
        
        html += `
            <tr>
                <td><input type="checkbox" class="contract-checkbox" data-id="${contract.id}" onclick="updateBatchButton()"></td>
                <td>${actualIndex + 1}</td>
                <td><strong>${contract.name}</strong></td>
                <td>${contract.contactPerson || '-'}</td>
                <td>${baseDate}</td>
                <td>${date40}</td>
                <td>${date45}</td>
                <td><span class="countdown ${countdownClass}">${countdown > 0 ? `${countdown}天` : '已超期'}</span></td>
                <td><span class="status-badge ${status}">${getStatusText(contract)}</span></td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar ${status}" style="width: ${Math.min(progress, 100)}%">
                            <span style="position: absolute; right: 8px; font-size: 10px; color: white; font-weight: bold;">${progress}%</span>
                        </div>
                        <div class="progress-marks">
                            <div class="mark-40"><span class="mark-label">40天</span></div>
                            <div class="mark-45"><span class="mark-label">45天</span></div>
                        </div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-edit" onclick="editContract(${contract.id})" title="编辑"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger" onclick="deleteContract(${contract.id})" title="删除"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });

    ganttBody.innerHTML = html;
    
    // 更新分页控件
    updatePagination(totalPages);
    updateStats();
}

// 切换视图
function switchView(view) {
    currentView = view;
    currentPage = 1;
    
    // 更新选项卡状态
    acceptTab.classList.toggle('active', view === 'accept');
    issueTab.classList.toggle('active', view === 'issue');
    
    // 更新表格
    updateTable();
}

// 编辑项目
function editContract(id) {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;
    
    // 填充表单
    document.getElementById('editId').value = contract.id;
    document.getElementById('editName').value = contract.name;
    document.getElementById('editContact').value = contract.contactPerson || '';
    document.getElementById('editAcceptDate').value = contract.replyDate;
    document.getElementById('editIssueDate').value = contract.issueDate || '';
    
    // 显示弹窗
    document.getElementById('editModal').style.display = 'flex';
}

// 关闭编辑弹窗
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// 保存编辑
function saveEdit() {
    const id = parseInt(document.getElementById('editId').value);
    const name = document.getElementById('editName').value.trim();
    const contact = document.getElementById('editContact').value.trim();
    const acceptDate = document.getElementById('editAcceptDate').value.trim();
    const issueDt = document.getElementById('editIssueDate').value.trim();
    
    if (!name) {
        alert('请输入项目名称');
        return;
    }
    
    if (!acceptDate) {
        alert('请选择受理日期');
        return;
    }
    
    const contractIndex = contracts.findIndex(c => c.id === id);
    if (contractIndex === -1) return;
    
    // 计算受理日期的提醒日期
    const acceptDate40 = addWorkDays(acceptDate, 40);
    const acceptDate45 = addWorkDays(acceptDate, 45);
    
    // 计算发行日期的提醒日期（如果有）
    let issueDate40 = '';
    let issueDate45 = '';
    if (issueDt) {
        issueDate40 = formatDate(addWorkDays(issueDt, 40));
        issueDate45 = formatDate(addWorkDays(issueDt, 45));
    }
    
    // 更新合同信息
    contracts[contractIndex] = {
        ...contracts[contractIndex],
        name: name,
        contactPerson: contact || '',
        replyDate: acceptDate,
        acceptDate40: formatDate(acceptDate40),
        acceptDate45: formatDate(acceptDate45),
        issueDate: issueDt || '',
        issueDate40: issueDate40,
        issueDate45: issueDate45
    };
    
    // 更新界面
    updateTable();
    updateCalendar();
    saveContracts();
    
    // 关闭弹窗
    closeEditModal();
    
    alert('项目信息已更新');
}

// 全选/取消全选
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.contract-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBatchButton();
}

// 更新批量删除按钮状态
function updateBatchButton() {
    const checkboxes = document.querySelectorAll('.contract-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const batchBtn = document.getElementById('batchDeleteBtn');
    
    if (checkedCount > 0) {
        batchBtn.disabled = false;
        batchBtn.innerHTML = `<i class="fas fa-trash"></i> 批量删除 (${checkedCount})`;
    } else {
        batchBtn.disabled = true;
        batchBtn.innerHTML = `<i class="fas fa-trash"></i> 批量删除`;
    }
}

// 批量删除
function batchDelete() {
    const checkboxes = document.querySelectorAll('.contract-checkbox');
    const selectedIds = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.dataset.id));
    
    if (selectedIds.length === 0) {
        alert('请先选择要删除的项目');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedIds.length} 个项目吗？此操作不可撤销。`)) {
        contracts = contracts.filter(c => !selectedIds.includes(c.id));
        updateTable();
        updateCalendar();
        saveContracts();
        
        // 重置全选框
        document.getElementById('selectAll').checked = false;
        updateBatchButton();
        
        alert(`已成功删除 ${selectedIds.length} 个项目`);
    }
}

// 更新分页控件
function updatePagination(totalPages) {
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页，共 ${contracts.length} 条`;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// 上一页
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateTable();
    }
}

// 下一页
function nextPage() {
    const totalPages = Math.ceil(contracts.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        updateTable();
    }
}

// 更新统计数据
function updateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let warning = 0;
    let danger = 0;
    
    contracts.forEach(contract => {
        // 受理日期提醒
        const acceptDate40 = new Date(contract.acceptDate40 || contract.date40);
        const acceptDate45 = new Date(contract.acceptDate45 || contract.date45);
        
        // 发行日期提醒（如果有）
        const hasIssueDate = contract.issueDate && contract.issueDate !== '';
        const issueDate40 = hasIssueDate ? new Date(contract.issueDate40) : null;
        const issueDate45 = hasIssueDate ? new Date(contract.issueDate45) : null;
        
        // 检查是否有任何日期超45天
        if (today > acceptDate45 || (hasIssueDate && today > issueDate45)) {
            danger++;
        } else if (today > acceptDate40 || (hasIssueDate && today > issueDate40)) {
            // 检查是否有任何日期超40天
            warning++;
        }
    });
    
    totalCount.textContent = contracts.length;
    warningCount.textContent = warning;
    dangerCount.textContent = danger;
    safeCount.textContent = contracts.length - warning - danger;
}

// 更新日历
function updateCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // 获取日历需要显示的第一天（上月末尾）
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - firstDay.getDay());
    
    // 生成日历头部
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    let calendarHtml = '<div class="calendar-header">';
    weekdays.forEach(day => {
        calendarHtml += `<div>${day}</div>`;
    });
    calendarHtml += '</div>';
    
    // 生成日期格子
    const day = new Date(startDay);
    let dayCount = 0;
    
    while (dayCount < 42) { // 6行 * 7列
        const isToday = formatDate(day) === formatDate(today);
        const isCurrentMonth = day.getMonth() === currentMonth;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        
        // 检查是否有提醒（受理日期和发行日期）
        let reminders = [];
        contracts.forEach(contract => {
            // 受理日期提醒
            const accept40 = contract.acceptDate40 || contract.date40;
            const accept45 = contract.acceptDate45 || contract.date45;
            
            if (formatDate(day) === accept40) {
                reminders.push({ 
                    name: contract.name, 
                    type: 'reminder-40', 
                    source: 'accept',
                    contract: contract 
                });
            }
            if (formatDate(day) === accept45) {
                reminders.push({ 
                    name: contract.name, 
                    type: 'reminder-45', 
                    source: 'accept',
                    contract: contract 
                });
            }
            
            // 发行日期提醒（如果有）
            if (contract.issueDate && contract.issueDate !== '') {
                if (formatDate(day) === contract.issueDate40) {
                    reminders.push({ 
                        name: contract.name, 
                        type: 'reminder-40', 
                        source: 'issue',
                        contract: contract 
                    });
                }
                if (formatDate(day) === contract.issueDate45) {
                    reminders.push({ 
                        name: contract.name, 
                        type: 'reminder-45', 
                        source: 'issue',
                        contract: contract 
                    });
                }
            }
        });
        
        // 检查日期是否在受理日期或发行日期范围内有项目
        let hasContract = false;
        contracts.forEach(contract => {
            const acceptDate = new Date(contract.replyDate);
            const acceptDate45 = new Date(contract.acceptDate45 || contract.date45);
            
            if (day >= acceptDate && day <= acceptDate45) {
                hasContract = true;
                return;
            }
            
            // 检查发行日期范围
            if (contract.issueDate && contract.issueDate !== '') {
                const issueDt = new Date(contract.issueDate);
                const issueDate45 = new Date(contract.issueDate45);
                if (day >= issueDt && day <= issueDate45) {
                    hasContract = true;
                }
            }
        });
        
        // 确定样式类
        let classes = 'calendar-day';
        if (!isCurrentMonth) classes += ' inactive';
        if (isToday) classes += ' today';
        if (isWeekend && isCurrentMonth) classes += ' weekend';
        
        // 优先显示提醒样式
        if (reminders.some(r => r.type === 'reminder-45')) {
            classes += ' reminder-45';
        } else if (reminders.some(r => r.type === 'reminder-40')) {
            classes += ' reminder-40';
        }
        
        // 生成tooltip内容
        let tooltipContent = '';
        if (reminders.length > 0) {
            tooltipContent = '<div class="tooltip-content">';
            reminders.forEach((reminder, idx) => {
                const sourceText = reminder.source === 'accept' ? '受理日期' : '发行日期';
                const typeText = reminder.type === 'reminder-40' ? '40天提醒' : '45天提醒';
                const c = reminder.contract;
                
                tooltipContent += `
                    <div class="tooltip-item${idx > 0 ? ' tooltip-divider' : ''}">
                        <div class="tooltip-title">${reminder.name}</div>
                        <div class="tooltip-detail">
                            <span class="tooltip-label">类型:</span> ${typeText} (${sourceText})
                        </div>
                        <div class="tooltip-detail">
                            <span class="tooltip-label">受理日期:</span> ${c.replyDate}
                        </div>
                        <div class="tooltip-detail">
                            <span class="tooltip-label">受理40天:</span> ${c.acceptDate40 || c.date40}
                        </div>
                        <div class="tooltip-detail">
                            <span class="tooltip-label">受理45天:</span> ${c.acceptDate45 || c.date45}
                        </div>
                        ${c.issueDate ? `
                        <div class="tooltip-detail">
                            <span class="tooltip-label">发行日期:</span> ${c.issueDate}
                        </div>
                        <div class="tooltip-detail">
                            <span class="tooltip-label">发行40天:</span> ${c.issueDate40}
                        </div>
                        <div class="tooltip-detail">
                            <span class="tooltip-label">发行45天:</span> ${c.issueDate45}
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            tooltipContent += '</div>';
        }
        
        calendarHtml += `<div class="${classes}" ${tooltipContent ? `data-tooltip="${encodeURIComponent(tooltipContent)}"` : ''}>`;
        calendarHtml += `<div class="day-number">${day.getDate()}</div>`;
        
        if (reminders.length > 0) {
            calendarHtml += '<div class="contracts">';
            reminders.forEach((reminder, idx) => {
                // 显示图标而不是文字，鼠标悬停显示详情
                const iconClass = reminder.type === 'reminder-40' ? 'reminder-icon-40' : 'reminder-icon-45';
                const sourceIcon = reminder.source === 'accept' ? 'A' : 'I';
                calendarHtml += `<span class="contract-icon ${iconClass}" title="${reminder.name}">${sourceIcon}</span>`;
            });
            calendarHtml += '</div>';
        }
        
        calendarHtml += '</div>';
        
        day.setDate(day.getDate() + 1);
        dayCount++;
    }
    
    calendarGrid.innerHTML = calendarHtml;
    initCalendarTooltips();
}

// 初始化日历tooltip
function initCalendarTooltips() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    let activeTooltip = null;
    
    calendarDays.forEach(day => {
        day.addEventListener('mouseenter', function(e) {
            const tooltipData = this.getAttribute('data-tooltip');
            if (!tooltipData) return;
            
            // 移除之前的tooltip
            if (activeTooltip) {
                activeTooltip.remove();
                activeTooltip = null;
            }
            
            const tooltipContent = decodeURIComponent(tooltipData);
            const tooltip = document.createElement('div');
            tooltip.className = 'calendar-tooltip';
            tooltip.innerHTML = tooltipContent;
            
            // 获取日期格子的位置信息
            const rect = this.getBoundingClientRect();
            const calendarRect = document.querySelector('.calendar-container').getBoundingClientRect();
            
            // 计算tooltip位置，避免超出视口
            let tooltipLeft = rect.right + 12;
            let tooltipTop = rect.top;
            
            // 如果右侧空间不足，显示在左侧
            if (tooltipLeft + 300 > window.innerWidth) {
                tooltipLeft = rect.left - 300 - 12;
                tooltip.classList.add('tooltip-left');
            }
            
            // 确保不超出顶部
            if (tooltipTop < 10) {
                tooltipTop = 10;
            }
            
            // 确保不超出底部
            if (tooltipTop + 200 > window.innerHeight) {
                tooltipTop = window.innerHeight - 200 - 10;
            }
            
            tooltip.style.left = tooltipLeft + 'px';
            tooltip.style.top = tooltipTop + 'px';
            
            // 添加到body而不是日历内部
            document.body.appendChild(tooltip);
            activeTooltip = tooltip;
        });
        
        day.addEventListener('mouseleave', function() {
            if (activeTooltip) {
                activeTooltip.remove();
                activeTooltip = null;
            }
        });
    });
}

// 保存合同到本地存储
function saveContracts() {
    localStorage.setItem('contracts', JSON.stringify(contracts));
}

// 从本地存储加载合同
function loadContracts() {
    const saved = localStorage.getItem('contracts');
    if (saved) {
        contracts = JSON.parse(saved);
        updateTable();
    }
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        // 验证文件类型
        const validExtensions = ['.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValid) {
            alert('请选择有效的Excel文件（.xlsx 或 .xls格式）');
            excelFile.value = '';
            selectedFile = null;
            importBtn.disabled = true;
            fileInfo.innerHTML = '<i class="fas fa-file-excel"></i><span>支持 .xlsx 和 .xls 格式</span>';
            return;
        }
        
        selectedFile = file;
        importBtn.disabled = false;
        fileInfo.innerHTML = `<i class="fas fa-file-check"></i><span>已选择: ${file.name}</span>`;
    }
}

// 导入Excel数据
function importExcelData() {
    if (!selectedFile) {
        alert('请先选择Excel文件');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 获取第一个工作表
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // 转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                alert('Excel文件中没有数据');
                return;
            }
            
            // 解析数据（自动识别日期类型）
            const importedContracts = parseExcelData(jsonData);
            
            if (importedContracts.length === 0) {
                alert('未找到有效的合同数据，请检查Excel文件格式');
                return;
            }
            
            // 检查重复项目
            const { duplicates, unique } = checkDuplicates(importedContracts);
            
            if (duplicates.length > 0) {
                // 显示重复项目信息并询问用户选择
                let duplicateInfo = `检测到 ${duplicates.length} 个重复项目：\n\n`;
                duplicates.forEach((dup, index) => {
                    duplicateInfo += `${index + 1}. ${dup.name}\n`;
                });
                
                const choice = prompt(duplicateInfo + '\n请选择处理方式：\n1 - 保留重复项（全部导入）\n2 - 剔除重复项（仅导入新项）');
                
                if (choice === '1') {
                    // 保留重复项
                    contracts.push(...importedContracts);
                    alert(`成功导入 ${importedContracts.length} 条项目记录（包含重复项）`);
                } else if (choice === '2') {
                    // 剔除重复项
                    contracts.push(...unique);
                    alert(`成功导入 ${unique.length} 条新记录，跳过 ${duplicates.length} 条重复记录`);
                } else {
                    alert('导入已取消');
                    return;
                }
            } else {
                // 无重复，直接导入
                contracts.push(...importedContracts);
                alert(`成功导入 ${importedContracts.length} 条项目记录`);
            }
            
            updateTable();
            updateCalendar();
            saveContracts();
            
            // 重置文件选择
            excelFile.value = '';
            selectedFile = null;
            importBtn.disabled = true;
            fileInfo.innerHTML = '<i class="fas fa-file-excel"></i><span>支持 .xlsx 和 .xls 格式</span>';
            
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败，请检查Excel文件格式是否正确');
        }
    };
    
    reader.readAsArrayBuffer(selectedFile);
}

// 检查重复项目
function checkDuplicates(importedContracts) {
    const duplicates = [];
    const unique = [];
    
    importedContracts.forEach(contract => {
        // 检查是否存在同名且同受理日期或同发行日期的项目
        const isDuplicate = contracts.some(c => {
            const sameName = c.name === contract.name;
            const sameAcceptDate = c.replyDate && contract.replyDate && c.replyDate === contract.replyDate;
            const sameIssueDate = c.issueDate && contract.issueDate && c.issueDate === contract.issueDate;
            return sameName && (sameAcceptDate || sameIssueDate);
        });
        
        if (isDuplicate) {
            duplicates.push(contract);
        } else {
            unique.push(contract);
        }
    });
    
    return { duplicates, unique };
}

// 解析Excel数据（自动识别日期类型）
function parseExcelData(jsonData) {
    const result = [];
    
    // 查找列索引
    const firstRow = jsonData[0];
    const headers = Object.keys(firstRow);
    
    // 查找项目名称、对接人、日期类型和日期列
    let nameColumn = '';
    let contactColumn = '';
    let dateTypeColumn = '';
    let dateColumn = '';
    let acceptDateColumn = '';
    let issueDateColumn = '';
    
    for (const header of headers) {
        const lowerHeader = header.toLowerCase().trim();
        if (lowerHeader.includes('项目名称') || lowerHeader.includes('项目名') || lowerHeader.includes('名称')) {
            nameColumn = header;
        }
        if (lowerHeader.includes('对接人') || lowerHeader.includes('联系人') || lowerHeader.includes('负责人')) {
            contactColumn = header;
        }
        if (lowerHeader.includes('日期类型') || lowerHeader.includes('类型')) {
            dateTypeColumn = header;
        }
        if (lowerHeader.includes('受理日期')) {
            acceptDateColumn = header;
        }
        if (lowerHeader.includes('发行日期') || lowerHeader.includes('发布日期')) {
            issueDateColumn = header;
        }
    }
    
    // 如果没有明确的受理日期或发行日期列，尝试找通用的日期列
    if (!acceptDateColumn && !issueDateColumn) {
        for (const header of headers) {
            const lowerHeader = header.toLowerCase().trim();
            if ((lowerHeader.includes('日期') || lowerHeader.includes('时间')) && !lowerHeader.includes('截止') && !lowerHeader.includes('提醒') && !lowerHeader.includes('类型')) {
                if (!dateColumn) {
                    dateColumn = header;
                }
            }
        }
    }
    
    if (!nameColumn) {
        alert('未找到"项目名称"列，请检查表头');
        return [];
    }
    
    if (!acceptDateColumn && !issueDateColumn && !dateColumn) {
        alert('未找到日期列（受理日期、发行日期或日期），请检查表头');
        return [];
    }
    
    // 解析每一行
    jsonData.forEach((row, index) => {
        const name = row[nameColumn];
        if (!name) {
            return; // 跳过空行
        }
        
        const contact = contactColumn ? row[contactColumn] : '';
        
        // 解析受理日期
        let replyDate = '';
        let acceptDate40 = '';
        let acceptDate45 = '';
        if (acceptDateColumn && row[acceptDateColumn]) {
            const parsedDate = parseDate(row[acceptDateColumn]);
            if (parsedDate) {
                replyDate = formatDate(new Date(parsedDate));
                acceptDate40 = formatDate(addWorkDays(parsedDate, 40));
                acceptDate45 = formatDate(addWorkDays(parsedDate, 45));
            }
        }
        
        // 解析发行日期
        let issueDt = '';
        let issueDate40 = '';
        let issueDate45 = '';
        if (issueDateColumn && row[issueDateColumn]) {
            const parsedDate = parseDate(row[issueDateColumn]);
            if (parsedDate) {
                issueDt = formatDate(new Date(parsedDate));
                issueDate40 = formatDate(addWorkDays(parsedDate, 40));
                issueDate45 = formatDate(addWorkDays(parsedDate, 45));
            }
        }
        
        // 如果有日期类型列和通用日期列，根据日期类型分配
        if (dateTypeColumn && dateColumn && row[dateColumn]) {
            const dateTypeValue = String(row[dateTypeColumn]).toLowerCase().trim();
            const parsedDate = parseDate(row[dateColumn]);
            
            if (parsedDate) {
                const date40 = formatDate(addWorkDays(parsedDate, 40));
                const date45 = formatDate(addWorkDays(parsedDate, 45));
                
                if (dateTypeValue.includes('受理') || dateTypeValue.includes('accept')) {
                    replyDate = formatDate(new Date(parsedDate));
                    acceptDate40 = date40;
                    acceptDate45 = date45;
                } else if (dateTypeValue.includes('发行') || dateTypeValue.includes('发布') || dateTypeValue.includes('issue')) {
                    issueDt = formatDate(new Date(parsedDate));
                    issueDate40 = date40;
                    issueDate45 = date45;
                }
            }
        }
        
        // 至少要有一个日期
        if (!replyDate && !issueDt) {
            return;
        }
        
        const contract = {
            id: Date.now() + index,
            name: String(name).trim(),
            contactPerson: contact ? String(contact).trim() : '',
            replyDate: replyDate,
            acceptDate40: acceptDate40,
            acceptDate45: acceptDate45,
            issueDate: issueDt,
            issueDate40: issueDate40,
            issueDate45: issueDate45
        };
        
        result.push(contract);
    });
    
    return result;
}

// 解析日期（支持多种格式）
function parseDate(dateValue) {
    // 如果是数字（Excel日期格式）
    if (typeof dateValue === 'number') {
        // Excel日期是从1900年1月1日开始的天数
        const excelEpoch = new Date(1899, 11, 30); // Excel的基准日期
        const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000);
        return date;
    }
    
    // 如果是字符串
    const strValue = String(dateValue).trim();
    
    // 格式: YYYY-MM-DD
    const match1 = strValue.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match1) {
        return new Date(match1[1], match1[2] - 1, match1[3]);
    }
    
    // 格式: YYYY年MM月DD日
    const match2 = strValue.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
    if (match2) {
        return new Date(match2[1], match2[2] - 1, match2[3]);
    }
    
    // 尝试直接解析
    const date = new Date(strValue);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    return null;
}

// 初始化
document.addEventListener('DOMContentLoaded', init);
