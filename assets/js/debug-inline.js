// Extracted app logic from debug-demo.html into external script
// Keep global state and functions on window where required by HTML

// Globals
let wgName = 'WG Darius & Co';
let memberNames = ['Darius', 'Lilly', 'Hendrik I', 'Hendrik II', 'Hamza Hamza', 'Sofia'];
let currentMemberIndex = 0;
let memberProfiles = [];
let selectedAvatar = '😊';
let tasks = [];
let currentTaskIndex = 0;
let currentRatingMemberIndex = 0;
let allRatings = {};
let ratings = {};
let taskExecutions = {};
let taskQualityRatings = {};
let wgProfiles = {}; // profile store
let currentProfileId = null;
let profiles = wgProfiles; // alias
let navigationHistory = [];
let absences = {};
let editingAbsence = null;
let urgentTasks = [];
let autoBackupEnabled = true;
const maxBackups = 10;
let userRatingsStatus = {};
let currentTaskData = null;
let selectedUserIndex = null;
let currentRatingTask = null;
let selectedRating = 0;
let currentEditProfileId = null;
let editMemberCounter = 0;
let currentRatingMember = null;
let currentRatingTaskIndex = 0;
let memberTaskRatings = {}; // Structure: {memberName: {taskName: rating}}

// Debug fixtures (subset sufficient for boot)
const debugProfiles = [
	{ name: 'Darius', avatar: '😎', email: 'darius@wg-darius.de' },
	{ name: 'Lilly', avatar: '🌸', email: 'lilly@wg-darius.de' },
	{ name: 'Hendrik I', avatar: '🤓', email: 'hendrik1@wg-darius.de' },
	{ name: 'Hendrik II', avatar: '😊', email: 'hendrik2@wg-darius.de' },
	{ name: 'Hamza Hamza', avatar: '🚀', email: 'hamza@wg-darius.de' },
	{ name: 'Sofia', avatar: '✨', email: 'sofia@wg-darius.de' }
];

const debugTasks = [
	{ title: 'Kitchen', description: 'Küche komplett reinigen', emoji: '🍳', minDaysBetween: 3, checklist: ['Spülmaschine ausräumen', 'Arbeitsflächen desinfizieren', 'Herd und Backofen säubern', 'Spüle und Wasserhahn putzen', 'Boden wischen'] },
	{ title: 'Big bathroom + shower', description: 'Großes Bad und Dusche gründlich reinigen', emoji: '🛁', minDaysBetween: 7, checklist: ['Dusche entkalken und schrubben','Toilette reinigen','Waschbecken putzen','Spiegel wischen','Boden wischen'] }
];

// --- UI helpers ---
function showSuccessToast(message) {
	const toast = document.createElement('div');
	toast.className = 'toast';
	toast.innerHTML = `
		<button class="toast-close" onclick="this.parentElement.remove()">×</button>
		${message}
	`;
	document.body.appendChild(toast);
	setTimeout(() => toast.classList.add('show'), 100);
	setTimeout(() => {
		if (document.body.contains(toast)) {
			toast.classList.remove('show');
			setTimeout(() => toast.remove(), 300);
		}
	}, 2000);
}

function showErrorToast(message) {
	const toast = document.createElement('div');
	toast.className = 'toast';
	toast.style.background = '#fee2e2';
	toast.style.color = '#991b1b';
	toast.innerHTML = `
		<button class="toast-close" onclick="this.parentElement.remove()">×</button>
		${message}
	`;
	document.body.appendChild(toast);
	setTimeout(() => toast.classList.add('show'), 100);
	setTimeout(() => {
		if (document.body.contains(toast)) {
			toast.classList.remove('show');
			setTimeout(() => toast.remove(), 300);
		}
	}, 2500);
}

function showInfoToast(message) {
	const toast = document.createElement('div');
	toast.className = 'toast';
	toast.style.background = '#eff6ff';
	toast.style.color = '#1e40af';
	toast.innerHTML = `
		<button class="toast-close" onclick="this.parentElement.remove()">×</button>
		${message}
	`;
	document.body.appendChild(toast);
	setTimeout(() => toast.classList.add('show'), 100);
	setTimeout(() => {
		if (document.body.contains(toast)) {
			toast.classList.remove('show');
			setTimeout(() => toast.remove(), 300);
		}
	}, 2200);
}

// --- Core helpers from inline script (minimal viable set) ---
function getCurrentProfileId() {
	let profileId = localStorage.getItem('currentProfileId');
	if (!profileId || profileId === 'undefined' || profileId === 'null') {
		profileId = 'default';
		localStorage.setItem('currentProfileId', profileId);
		if (!profiles[profileId]) {
			profiles[profileId] = {
				name: 'Standard WG',
				members: ['User1', 'User2'],
				currentUser: 'User1',
				created: new Date().toISOString(),
				lastUsed: new Date().toISOString()
			};
			localStorage.setItem('wgProfiles', JSON.stringify(profiles));
		}
	}
	return profileId;
}

function getCurrentUser() {
	const profileId = getCurrentProfileId();
	const profileData = profiles[profileId];
	if (profileData && profileData.currentUser) return profileData.currentUser;
	if (profileData && profileData.members && profileData.members.length > 0) return profileData.members[0];
	return 'User1';
}

function saveCurrentState() {
	try {
		if (wgName) localStorage.setItem('wgName', wgName);
		if (memberProfiles && memberProfiles.length > 0) localStorage.setItem('wgMembers', JSON.stringify(memberProfiles));
		if (tasks && tasks.length > 0) localStorage.setItem('tasks', JSON.stringify(tasks));
		if (Object.keys(ratings||{}).length > 0) localStorage.setItem('ratings', JSON.stringify(ratings));
		if (Object.keys(allRatings||{}).length > 0) localStorage.setItem('allRatings', JSON.stringify(allRatings));
		if (Object.keys(taskExecutions||{}).length > 0) localStorage.setItem('taskExecutions', JSON.stringify(taskExecutions));
		if (Object.keys(absences||{}).length > 0) localStorage.setItem('absences', JSON.stringify(absences));
	} catch(e) {
		console.error('Fehler beim Speichern:', e);
	}
}

function getCurrentPeriod() {
	const settings = localStorage.getItem('periodSettings');
	if (settings) {
		const parsed = JSON.parse(settings);
		if (parsed.startDate && parsed.endDate) {
			const start = new Date(parsed.startDate);
			const end = new Date(parsed.endDate);
			const days = Math.ceil((end - start) / (1000*60*60*24)) + 1;
			return { start, end, days };
		}
	}
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const days = Math.ceil((end - start) / (1000*60*60*24)) + 1;
	return { start, end, days };
}

function calculateTaskPoints(minutes, pain, importance, frequency) {
	if (typeof minutes === 'string' && pain === undefined) {
		const taskTitle = minutes;
		const task = tasks.find(t => t.title === taskTitle);
		if (!task) return 10;
		const taskRatings = [];
		memberProfiles.forEach(profile => {
			if (memberTaskRatings[profile.name] && memberTaskRatings[profile.name][taskTitle]) {
				taskRatings.push(memberTaskRatings[profile.name][taskTitle]);
			}
		});
		if (taskRatings.length === 0) return 10;
		const avgMinutes = taskRatings.reduce((s,r)=>s+r.minutes,0)/taskRatings.length;
		const avgPain = taskRatings.reduce((s,r)=>s+r.pain,0)/taskRatings.length;
		const avgImportance = taskRatings.reduce((s,r)=>s+r.importance,0)/taskRatings.length;
		return Math.round((avgMinutes + (avgMinutes*avgPain/10))*avgImportance);
	} else {
		const m = minutes||0, p = pain||0, imp = importance||0;
		return Math.round((m + (m*p/10))*imp);
	}
}

function calculateTaskPointsForDisplay(task) {
	try {
		const currentProfile = getCurrentProfileId();
		const profile = profiles[currentProfile];
		if (!profile) return task.points || 10;

		// Prefer memberTaskRatings structure
		const collected = [];
		if (memberProfiles && memberProfiles.length) {
			memberProfiles.forEach(mp => {
				const r = memberTaskRatings?.[mp.name]?.[task.title];
				if (r) collected.push(r);
			});
		}
		// Fallback: taskQualityRatings aggregate shape {taskId:{user:{...}}} or similar
		if (collected.length === 0 && taskQualityRatings && taskQualityRatings[task.title]) {
			const vals = Object.values(taskQualityRatings[task.title]);
			vals.forEach(v => collected.push(v));
		}
		if (collected.length > 0) {
			const avgMinutes = collected.reduce((s,r)=>s+(r.minutes||0),0)/collected.length;
			const avgPain = collected.reduce((s,r)=>s+(r.pain||0),0)/collected.length;
			const avgImportance = collected.reduce((s,r)=>s+(r.importance||0),0)/collected.length;
			return Math.round((avgMinutes + (avgMinutes*avgPain/10))*avgImportance);
		}
		// Intelligent defaults based on title
		const name = (task.title||'').toLowerCase();
		if (name.includes('küche') || name.includes('kitchen')) return 25;
		if (name.includes('bad') || name.includes('bathroom')) return 20;
		if (name.includes('müll') || name.includes('trash') || name.includes('garbage')) return 8;
		if (name.includes('staub') || name.includes('dust') || name.includes('wisch')) return 15;
		if (name.includes('fenster') || name.includes('window')) return 18;
		if (name.includes('boden') || name.includes('floor') || name.includes('saug')) return 22;
		return task.points || 10;
	} catch (e) {
		console.error('Error calculating task display points:', e);
		return task.points || 10;
	}
}

function generateStrokeDisplay(count) {
	if (count === 0) return '';
	let result = '';
	let remaining = count;
	while (remaining >= 5) {
		result += `<span class="tally-group" style="display:inline-block;position:relative;margin-right:8px;width:24px;height:18px;">
			<span style="position:absolute;left:2px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
			<span style="position:absolute;left:6px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
			<span style="position:absolute;left:10px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
			<span style="position:absolute;left:14px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
			<span style="position:absolute;left:0;top:6px;width:20px;height:2px;background:#dc2626;border-radius:1px;transform:rotate(-25deg);transform-origin:center;"></span>
		</span>`;
		remaining -= 5;
	}
	if (remaining > 0) {
		const width = remaining * 4;
		result += `<span style="display:inline-block;position:relative;width:${width}px;height:16px;margin-right:4px;">`;
		for (let i=0;i<remaining;i++) {
			result += `<span style="position:absolute;left:${i*4}px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>`;
		}
		result += `</span>`;
	}
	return result;
}

function getCurrentPeriodRatio() {
	const p = getCurrentPeriod();
	return p.days/30;
}

function calculateMonthlyTargetPoints() {
	const periodRatio = getCurrentPeriodRatio();
	let totalPeriodPoints = 0;
	tasks.forEach(task => {
		const collected = [];
		memberProfiles.forEach(p => {
			const r = memberTaskRatings?.[p.name]?.[task.title];
			if (r) collected.push(r);
		});
		if (collected.length>0){
			const avgMinutes = collected.reduce((s,r)=>s+r.minutes,0)/collected.length;
			const avgPain = collected.reduce((s,r)=>s+r.pain,0)/collected.length;
			const avgImportance = collected.reduce((s,r)=>s+r.importance,0)/collected.length;
			const avgFrequency = collected.reduce((s,r)=>s+r.frequency,0)/collected.length;
			const taskPoints = Math.round((avgMinutes + (avgMinutes*avgPain/10))*avgImportance);
			const periodTaskPoints = Math.round(taskPoints * avgFrequency * periodRatio);
			totalPeriodPoints += periodTaskPoints;
		}
	});
	return memberProfiles.length ? Math.round(totalPeriodPoints / memberProfiles.length) : 0;
}

function isUserCurrentlyAbsent(userName) {
	const today = new Date();
	const userAbsences = absences[userName] || [];
	return userAbsences.some(absence => {
		const startDate = new Date(absence.startDate);
		const endDate = new Date(absence.endDate);
		return today >= startDate && today <= endDate;
	});
}

function getAbsenceDaysThisMonth(userName) {
	if (!absences[userName]) return 0;
	const period = getCurrentPeriod();
	return absences[userName].reduce((total, absence) => {
		const start = new Date(absence.startDate);
		const end = new Date(absence.endDate);
		if ((start <= period.end && end >= period.start)) {
			const overlapStart = new Date(Math.max(start.getTime(), period.start.getTime()));
			const overlapEnd = new Date(Math.min(end.getTime(), period.end.getTime()));
			const overlapDays = Math.max(0, Math.ceil((overlapEnd - overlapStart) / (1000*60*60*24)) + 1);
			return total + overlapDays;
		}
		return total;
	}, 0);
}

function calculateAdjustedTarget(baseTarget, absenceDays) {
	const p = getCurrentPeriod();
	const dailyTarget = baseTarget / p.days;
	const reduction = Math.round(dailyTarget * absenceDays);
	return Math.max(0, baseTarget - reduction);
}

function getTaskEmoji(taskTitle){
	const task = tasks.find(t=>t.title===taskTitle);
	return task ? task.emoji : '📋';
}

// Cooldown: use minDaysBetween consistently
function getNextExecutionDate(taskTitle) {
	try {
		const currentUser = getCurrentUser();
		if (!currentUser || !taskExecutions[currentUser]) return null;
		const task = tasks.find(t => t.title === taskTitle);
		if (!task || !task.minDaysBetween || task.minDaysBetween <= 0) return null;
		const userExecutions = taskExecutions[currentUser][taskTitle];
		if (!userExecutions || userExecutions.length === 0) return null;
		const lastExecution = userExecutions.reduce((latest, exec) => {
			const execDate = new Date(exec.timestamp);
			const latestDate = new Date(latest.timestamp);
			return execDate > latestDate ? exec : latest;
		});
		const lastDate = new Date(lastExecution.timestamp);
		const nextDate = new Date(lastDate);
		nextDate.setDate(nextDate.getDate() + task.minDaysBetween);
		return nextDate.toISOString();
	} catch (e) {
		console.error('Error calculating next execution date:', e);
		return null;
	}
}

function selectTaskToExecute(taskTitle, taskIndex) {
	currentTaskData = { task: tasks[taskIndex], taskIndex };
	showTaskExecutionModal();
}

function showTaskExecutionModal(){
	const modal = document.getElementById('taskExecutionModal');
	if (!modal || !currentTaskData) return;
	const task = currentTaskData.task;
	const emojiEl = document.getElementById('modalTaskEmoji');
	const nameEl = document.getElementById('modalTaskName');
	const descEl = document.getElementById('modalTaskDescription');
	if (emojiEl) emojiEl.textContent = task.emoji;
	if (nameEl) nameEl.textContent = task.title;
	if (descEl) descEl.textContent = task.description || 'Keine Beschreibung verfügbar';
	const userGrid = document.getElementById('modalUserGrid');
	if (userGrid) {
		userGrid.innerHTML = memberProfiles.map((p, idx)=>`
			<div class="user-card" data-user-index="${idx}" onclick="selectUser(${idx})">
				<div class="user-avatar">${p.avatar}</div>
				<div class="user-name">${p.name}</div>
			</div>
		`).join('');
	}
	selectedUserIndex = null;
	const userSel = document.getElementById('userSelectionSection');
	const checklist = document.getElementById('checklistSection');
	if (userSel) userSel.style.display='block';
	if (checklist) checklist.style.display='none';
	const executeBtn = document.getElementById('modalExecuteBtn');
	if (executeBtn){
		executeBtn.disabled = true;
		executeBtn.textContent = 'Task erledigt! ✓';
		executeBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
		executeBtn.onclick = executeTask;
	}
	const cancelBtn = document.getElementById('modalCancelBtn');
	if (cancelBtn) cancelBtn.onclick = closeTaskModal;
	modal.classList.add('show');
}

function selectUser(userIndex){
	selectedUserIndex = userIndex;
	document.querySelectorAll('.user-card').forEach((card, idx)=>{
		if (idx === userIndex) card.classList.add('selected'); else card.classList.remove('selected');
	});
	const task = currentTaskData.task;
	const user = memberProfiles[userIndex];
	if (task.checklist && task.checklist.length>0){
		const userSel = document.getElementById('userSelectionSection');
		if (userSel) userSel.style.display='none';
		showSuccessToast(`👤 ${user.name} ausgewählt! Jetzt Checklist abarbeiten:`);
		setTimeout(()=>showChecklistSection(), 300);
	} else {
		const userSel = document.getElementById('userSelectionSection');
		if (userSel) userSel.style.display='none';
		showSuccessToast(`👤 ${user.name} ausgewählt! Task kann erledigt werden:`);
		const executeBtn = document.getElementById('modalExecuteBtn');
		if (executeBtn){
			executeBtn.disabled = false;
			executeBtn.textContent = `✅ Task für ${user.name} erledigen!`;
		}
	}
}

function showChecklistSection(){
	const checklistSection = document.getElementById('checklistSection');
	if (!checklistSection) return;
	checklistSection.style.display = 'block';
	const container = document.getElementById('modalChecklist');
	const task = currentTaskData.task;
	const user = memberProfiles[selectedUserIndex];
	const title = checklistSection.querySelector('h3');
	if (title) title.innerHTML = `📋 ${user.name}, arbeite die Checklist ab:`;
	container.innerHTML = task.checklist.map((item, idx)=>`
		<div class="checklist-item">
			<input type="checkbox" id="checkItem_${idx}" onchange="updateExecuteButton()">
			<label for="checkItem_${idx}" style="margin:0;cursor:pointer;flex:1;">${item}</label>
		</div>`).join('');
	setTimeout(()=>{ checklistSection.scrollIntoView({behavior:'smooth', block:'nearest'}); }, 100);
	updateExecuteButton();
}

function updateExecuteButton(){
	const checkboxes = document.querySelectorAll('#modalChecklist input[type="checkbox"]');
	const allChecked = Array.from(checkboxes).every(cb=>cb.checked);
	const executeBtn = document.getElementById('modalExecuteBtn');
	if (!executeBtn) return;
	executeBtn.disabled = !allChecked;
	if (selectedUserIndex !== null){
		const user = memberProfiles[selectedUserIndex];
		if (allChecked){
			executeBtn.textContent = `🎉 Task für ${user.name} erledigt!`;
			executeBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
		} else {
			const checkedCount = Array.from(checkboxes).filter(cb=>cb.checked).length;
			executeBtn.textContent = `📋 ${checkedCount}/${checkboxes.length} abgehakt`;
			executeBtn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
		}
	}
}

function completeTaskExecution(taskTitle, userName, taskIndex){
	if (!taskExecutions[userName]) taskExecutions[userName] = {};
	if (!taskExecutions[userName][taskTitle]) taskExecutions[userName][taskTitle] = [];
	const taskPoints = calculateTaskPoints(taskTitle);
	const execution = { date: new Date().toISOString(), timestamp: Date.now(), points: taskPoints, id: Date.now()+'_'+Math.random().toString(36).substr(2,9) };
	taskExecutions[userName][taskTitle].push(execution);
	updateDashboardStats();
	showSuccessToast(`✅ "${taskTitle}" erledigt! ${userName} erhält ${taskPoints} Punkte!`);
	buildTaskTable();
}

function executeTask(){
	if (selectedUserIndex === null) return;
	const user = memberProfiles[selectedUserIndex];
	const task = currentTaskData.task;
	completeTaskExecution(task.title, user.name, currentTaskData.taskIndex);
	closeTaskModal();
}

function closeTaskModal(){
	const modal = document.getElementById('taskExecutionModal');
	if (modal) modal.classList.remove('show');
	currentTaskData = null;
	selectedUserIndex = null;
}

function buildTaskTable(){
	const table = document.getElementById('taskTableGrid');
	if (!table) return;
	let headerHtml = '<thead><tr><th style="border:1px solid #e5e7eb;padding:16px 20px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);text-align:left;font-weight:600;color:#334155;font-size:14px;">Task</th>';
	memberProfiles.forEach(profile=>{
		headerHtml += `<th style="border:1px solid #e5e7eb;padding:16px 20px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);text-align:center;font-weight:600;color:#334155;font-size:14px;min-width:120px;">${profile.avatar} ${profile.name}</th>`;
	});
	headerHtml += '</tr></thead>';
	let bodyHtml = '<tbody>';
	tasks.forEach((task, taskIndex)=>{
		const isUrgent = false; // minimal: no urgent priority in extracted version
		const urgentClass = isUrgent ? 'urgent-task' : '';
		const urgentBg = isUrgent ? '#fef2f2' : '#ffffff';
		const urgentHoverBg = isUrgent ? '#fee2e2' : '#f8fafc';
		const urgentBorder = isUrgent ? '2px solid #ef4444' : '1px solid #e5e7eb';
		const taskPoints = calculateTaskPointsForDisplay(task);
		let nextExecutionInfo = '';
		if (task.minDaysBetween && task.minDaysBetween > 0){
			const nextDate = getNextExecutionDate(task.title);
			if (nextDate){
				const isAvailable = new Date() >= new Date(nextDate);
				const dateStr = new Date(nextDate).toLocaleDateString('de-DE');
				nextExecutionInfo = `<div style="font-size:11px;color:${isAvailable?'#10b981':'#ef4444'};margin-top:2px;"><i class="fas fa-clock" style="font-size:10px;"></i> ${isAvailable ? 'Verfügbar' : dateStr}</div>`;
			}
		}
		bodyHtml += `<tr style="transition:all 0.2s ease;" class="${urgentClass}">
			<td style="border:${urgentBorder};padding:16px 20px;font-weight:500;cursor:pointer;background:${urgentBg};" onclick="selectTaskToExecute('${task.title}', ${taskIndex})" onmouseover="this.style.backgroundColor='${urgentHoverBg}'" onmouseout="this.style.backgroundColor='${urgentBg}'">>
				<div style="display:flex;align-items:center;gap:12px;">
					<span style="font-size:18px;">${task.emoji}</span>
					<div style="flex:1;">
						<div style="display:flex;align-items:center;gap:8px;">
							<span style="color:#334155;font-size:15px;font-weight:500;">${task.title}</span>
							<span style="background:#f3f4f6;color:#059669;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">${taskPoints}P</span>
						</div>
						${nextExecutionInfo}
					</div>
				</div>
			</td>`;
		memberProfiles.forEach(profile=>{
			const executions = taskExecutions[profile.name]?.[task.title] || [];
			const strokesDisplay = generateStrokeDisplay(executions.length);
			const totalPoints = executions.reduce((sum,exec)=>sum+(exec.points||0),0);
			const isAbsent = isUserCurrentlyAbsent(profile.name);
			if (isAbsent){
				const goneFishingSymbol = '🏖️';
				bodyHtml += `<td style="border:1px solid #e5e7eb;padding:16px 20px;text-align:center;font-family:'SF Mono',Monaco,monospace;font-size:16px;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);min-width:120px;">
					<div class="gone-fishing" title="${profile.name} ist aktuell abwesend">${goneFishingSymbol}</div>
					<div style="font-size:10px;color:#0891b2;font-family:system-ui;margin-top:2px;">Abwesend</div>
				</td>`;
			} else {
				bodyHtml += `<td style="border:1px solid #e5e7eb;padding:16px 20px;text-align:center;font-family:'SF Mono',Monaco,monospace;font-size:16px;background:#ffffff;min-width:120px;">
					<div style="color:#1f2937;font-weight:500;">${strokesDisplay || '-'}</div>
					<div style="font-size:11px;color:#64748b;font-family:system-ui;margin-top:4px;">(${totalPoints}P)</div>
				</td>`;
			}
		});
		bodyHtml += '</tr>';
	});
	bodyHtml += '</tbody>';
	let totalsHtml = '<tfoot><tr><td style="border:1px solid #e5e7eb;padding:16px 20px;font-weight:700;background:linear-gradient(135deg,#e2e8f0 0%,#cbd5e1 100%);color:#475569;font-size:14px;">GESAMT</td>';
	memberProfiles.forEach(profile=>{
		const isAbsent = isUserCurrentlyAbsent(profile.name);
		if (isAbsent){
			const goneFishingSymbol = '🏖️';
			totalsHtml += `<td style="border:1px solid #e5e7eb;padding:16px 20px;text-align:center;font-weight:600;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);min-width:120px;">
				<div class="gone-fishing" style="font-size:24px;" title="${profile.name} ist aktuell abwesend">${goneFishingSymbol}</div>
				<div style="font-size:10px;color:#0891b2;margin-top:2px;">Gone Fishing</div>
			</td>`;
		} else {
			let userTotalPoints = 0;
			let userTotalTasks = 0;
			Object.entries(taskExecutions[profile.name]||{}).forEach(([taskTitle, executions])=>{
				userTotalPoints += executions.reduce((s,e)=>s+(e.points||0),0);
				userTotalTasks += executions.length;
			});
			const baseMonthlyTarget = calculateMonthlyTargetPoints();
			const absenceDays = getAbsenceDaysThisMonth(profile.name);
			const adjustedTarget = absenceDays>0 ? calculateAdjustedTarget(baseMonthlyTarget, absenceDays) : baseMonthlyTarget;
			const percentage = adjustedTarget>0 ? Math.round((userTotalPoints/adjustedTarget)*100) : 0;
			const absenceIndicator = absenceDays>0 ? ` 🏖️` : '';
			const targetDisplay = absenceDays>0 ? `${adjustedTarget}P (${baseMonthlyTarget}P-${absenceDays}d)` : `${adjustedTarget}P`;
			totalsHtml += `<td style="border:1px solid #e5e7eb;padding:16px 20px;text-align:center;font-weight:600;background:linear-gradient(135deg,#e2e8f0 0%,#cbd5e1 100%);min-width:120px;">
				<div style="font-size:15px;color:#059669;font-weight:700;">${userTotalPoints}P${absenceIndicator}</div>
				<div style="font-size:11px;color:#64748b;margin:2px 0;">${userTotalPoints}/${targetDisplay} (${percentage}%)</div>
				<div style="font-size:10px;color:#94a3b8;">${userTotalTasks} Tasks</div>
			</td>`;
		}
	});
	totalsHtml += '</tr></tfoot>';
	table.innerHTML = headerHtml + bodyHtml + totalsHtml;
}

function updateDashboardStats(){
	const totalTasksElement = document.getElementById('totalTasksCount');
	if (totalTasksElement) totalTasksElement.textContent = tasks.length;
	const today = new Date().toDateString();
	let todayCount = 0;
	Object.values(taskExecutions).forEach(userTasks=>{
		Object.values(userTasks).forEach(execs=>{ todayCount += execs.filter(exec=> new Date(exec.date).toDateString() === today).length; });
	});
	const todayElement = document.getElementById('completedTasksToday');
	if (todayElement) todayElement.textContent = todayCount;
	const taskTablePhase = document.getElementById('taskTable');
	if (taskTablePhase && !taskTablePhase.classList.contains('hidden')) buildTaskTable();
}

// Minimal boot
document.addEventListener('DOMContentLoaded', () => {
	// Try load from storage
	try {
		const savedProfiles = localStorage.getItem('wgProfiles');
		if (savedProfiles && savedProfiles !== 'undefined') {
			wgProfiles = JSON.parse(savedProfiles);
			profiles = wgProfiles;
		}
		const savedAbsences = localStorage.getItem('absences');
		if (savedAbsences && savedAbsences !== 'undefined') absences = JSON.parse(savedAbsences);
		const savedMemberRatings = localStorage.getItem('memberTaskRatings');
		if (savedMemberRatings) memberTaskRatings = JSON.parse(savedMemberRatings);
	} catch(e) { console.warn('Load storage fallback', e); }

	// If empty, seed demo data to keep debug demo working
	if (!memberProfiles.length) memberProfiles = [...debugProfiles];
	if (!tasks.length) tasks = [...debugTasks];

	// Initial dashboard
	if (typeof window.showProfileSelection === 'function') {
		// Let existing navigation take over if defined elsewhere
	}
	// Update dashboard counters if dashboard is visible
	updateDashboardStats();
});

// Expose globals
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showInfoToast = showInfoToast;
window.calculateTaskPoints = calculateTaskPoints;
window.calculateTaskPointsForDisplay = calculateTaskPointsForDisplay;
window.getNextExecutionDate = getNextExecutionDate;
window.selectTaskToExecute = selectTaskToExecute;
window.showTaskExecutionModal = showTaskExecutionModal;
window.selectUser = selectUser;
window.showChecklistSection = showChecklistSection;
window.updateExecuteButton = updateExecuteButton;
window.executeTask = executeTask;
window.closeTaskModal = closeTaskModal;
window.buildTaskTable = buildTaskTable;
window.updateDashboardStats = updateDashboardStats;
window.getTaskEmoji = getTaskEmoji;