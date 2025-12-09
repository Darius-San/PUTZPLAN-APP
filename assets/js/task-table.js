// Renders the dynamic task table previously inlined in debug-demo.html
(function(global){
  'use strict';

  function renderTaskTable(){
    const table = document.getElementById('taskTableGrid');
    if(!table) return;
    if(!Array.isArray(global.tasks) || !Array.isArray(global.memberProfiles)) return;

    let headerHtml = '<thead><tr><th style="border:1px solid #e5e7eb;padding:16px 20px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);text-align:left;font-weight:600;color:#334155;font-size:14px;">Task</th>';
    global.memberProfiles.forEach(p=>{
      headerHtml += `<th style="border:1px solid #e5e7eb;padding:16px 20px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);text-align:center;font-weight:600;color:#334155;font-size:14px;min-width:120px;">${p.avatar} ${p.name}</th>`;
    });
    headerHtml += '</tr></thead>';

    let bodyHtml = '<tbody>';
    global.tasks.forEach((task, taskIndex)=>{
      const isUrgent = global.isTaskUrgent ? global.isTaskUrgent(task.title) : false;
      const urgentClass = isUrgent ? 'urgent-task' : '';
      const urgentBg = isUrgent ? '#fef2f2' : '#ffffff';
      const urgentHoverBg = isUrgent ? '#fee2e2' : '#f8fafc';
      const urgentBorder = isUrgent ? '2px solid #ef4444' : '1px solid #e5e7eb';

      const taskPoints = global.calculateTaskPointsForDisplay ? global.calculateTaskPointsForDisplay(task) : 0;
      let nextExecutionInfo = '';
      if(task.minInterval && task.minInterval > 0 && global.getNextExecutionDate){
        const nextDate = global.getNextExecutionDate(task.title);
        if(nextDate){
          const isAvailable = new Date() >= new Date(nextDate);
            const dateStr = new Date(nextDate).toLocaleDateString('de-DE');
            nextExecutionInfo = `<div style="font-size:11px;color:${isAvailable ? '#10b981' : '#ef4444'};margin-top:2px;"><i class=\"fas fa-clock\" style=\"font-size:10px;\"></i> ${isAvailable ? 'Verfügbar' : dateStr}</div>`;
        }
      }

      bodyHtml += `<tr style="transition:all 0.2s ease;" class="${urgentClass}">`;
      bodyHtml += `<td style="border:${urgentBorder};padding:16px 20px;font-weight:500;cursor:pointer;background:${urgentBg};" onclick="selectTaskToExecute('${task.title.replace(/'/g,"&#39;")}',${taskIndex})" onmouseover="this.style.backgroundColor='${urgentHoverBg}'" onmouseout="this.style.backgroundColor='${urgentBg}'">`;
      bodyHtml += `<div style="display:flex;align-items:center;gap:12px;">`;
      bodyHtml += `${isUrgent ? '<i class=\"fas fa-exclamation-triangle\" style=\"color:#ef4444;font-size:16px;animation:urgent-flash 2s infinite;\"></i>' : ''}`;
      bodyHtml += `<span style="font-size:18px;">${task.emoji || ''}</span>`;
      bodyHtml += `<div style="flex:1;">`;
      bodyHtml += `<div style="display:flex;align-items:center;gap:8px;">`;
      bodyHtml += `<span style="color:${isUrgent ? '#dc2626' : '#334155'};font-size:15px;font-weight:${isUrgent ? '700':'500'};">${task.title}</span>`;
      bodyHtml += `<span style="background:#f3f4f6;color:#059669;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">${taskPoints}P</span>`;
      if(isUrgent){ bodyHtml += `<span style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:bold;text-transform:uppercase;">DRINGEND</span>`; }
      bodyHtml += `</div>${nextExecutionInfo}</div></div></td>`;

      global.memberProfiles.forEach(profile=>{
        const executions = (global.taskExecutions && global.taskExecutions[profile.name] && global.taskExecutions[profile.name][task.title]) || [];
        const executionCount = executions.length;
        const strokesDisplay = global.generateStrokeDisplay ? global.generateStrokeDisplay(executionCount) : '';
        const totalPoints = executions.reduce((sum, exec)=> sum + (exec.points || 0), 0);
        bodyHtml += `<td style="border:1px solid #e5e7eb;padding:12px 16px;text-align:center;font-size:13px;vertical-align:top;">`;
        bodyHtml += `<div style=\"display:flex;flex-direction:column;gap:4px;align-items:center;\">`;
        bodyHtml += `<div style=\"font-size:12px;color:#334155;font-weight:500;\">${executionCount}x</div>`;
        bodyHtml += `<div>${strokesDisplay}</div>`;
        bodyHtml += `<div style=\"background:#f8fafc;padding:4px 8px;border-radius:6px;font-size:11px;color:#475569;font-weight:600;\">${totalPoints}P</div>`;
        bodyHtml += `</div>`;
        bodyHtml += `</td>`;
      });

      bodyHtml += '</tr>';
    });
    bodyHtml += '</tbody>';

    table.innerHTML = headerHtml + bodyHtml;
  }

  global.renderTaskTable = renderTaskTable;
})(window);
