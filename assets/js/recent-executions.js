// recent-executions.js - renders the list of recently completed tasks
(function(global){
  function buildRecentCompletedTasks(){
    const container = document.getElementById('recentCompletedTasks');
    if(!container) return;
    const selectedUserEl = document.getElementById('ratingUserSelect');
    const selectedUser = selectedUserEl ? selectedUserEl.value : null;

    const allExecutions = [];
    const taskExecutions = global.taskExecutions || {};
    Object.entries(taskExecutions).forEach(([userName, userTasks])=>{
      Object.entries(userTasks).forEach(([taskTitle, executions])=>{
        executions.forEach(execution=>{
          allExecutions.push({ ...execution, taskTitle, userName, canRate: true });
        });
      });
    });

    allExecutions.sort((a,b)=> new Date(b.date) - new Date(a.date));
    const recentTasks = allExecutions.slice(0,10);
    let html='';
    if(recentTasks.length===0){
      html = '<div class="text-center text-gray-500 py-8">Noch keine Tasks erledigt</div>';
    } else {
      recentTasks.forEach((task,index)=>{
        const taskDate = new Date(task.date);
        const daysAgo = Math.floor((Date.now()-taskDate.getTime())/(1000*60*60*24));
        const timeAgoText = daysAgo===0 ? 'Heute' : daysAgo===1 ? 'Gestern' : `vor ${daysAgo} Tagen`;
        const safeTaskId = task.id.toString().replace(/'/g,"\\'");
        const safeTaskTitle = task.taskTitle.replace(/'/g,"\\'");
        const safeUserName = task.userName.replace(/'/g,"\\'");
        html += `<div id="task-item-${index}" class="task-execution-item clickable-task" onclick="openTaskRatingModal('${safeTaskId}','${safeTaskTitle}','${safeUserName}'); return false;" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;margin:8px 0;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;transition:background-color .2s;background:#f9fafb;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:20px;">${global.getTaskEmoji?global.getTaskEmoji(task.taskTitle):'🧹'}</div>
            <div>
              <div class="font-bold">${task.taskTitle}</div>
              <div class="text-sm text-gray-600">von ${task.userName} • ${timeAgoText}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="text-align:right;">
              <div class="font-bold" style="color:#059669;">${task.points || 0}P</div>
              <div class="text-sm text-gray-600">${taskDate.toLocaleDateString('de-DE')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;color:#fbbf24;font-size:14px;"><i class="fas fa-star"></i><span>Bewerten</span></div>
          </div>
        </div>`;
      });
    }
    container.innerHTML = html;
  }

  global.buildRecentCompletedTasks = buildRecentCompletedTasks;
})(window);
