// absence-render.js - renders urgent task modal list (was inline) and related helpers
(function(global){
  function buildUrgentTaskList(){
    const modal = document.getElementById('urgentTaskModal');
    const taskList = document.getElementById('urgentTaskList');
    if(!modal || !taskList) return;
    const tasks = global.tasks || [];
    const urgentTasks = global.urgentTasks || [];
    let html='';
    tasks.forEach((task,index)=>{
      const isUrgent = urgentTasks.some(ut=>ut.taskTitle===task.title);
      const urgentClass = isUrgent ? 'urgent-task' : '';
      const urgentIcon = isUrgent ? '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> ' : '';
      const taskPoints = global.calculateTaskPointsForDisplay ? global.calculateTaskPointsForDisplay(task) : 0;
      let nextExecutionInfo='';
      if(task.minInterval && task.minInterval>0 && typeof global.getNextExecutionDate==='function'){
        const nextDate = global.getNextExecutionDate(task.title);
        if(nextDate){
          const isAvailable = new Date() >= new Date(nextDate);
          const dateStr = new Date(nextDate).toLocaleDateString('de-DE');
          nextExecutionInfo = `<div style="font-size:12px;color:${isAvailable ? '#10b981' : '#ef4444'};margin-top:4px;"><i class=\"fas fa-clock\"></i> ${isAvailable ? 'Verfügbar' : 'Verfügbar ab'}: ${dateStr}</div>`;
        }
      }
      const safeTitle = task.title.replace(/'/g,"\\'");
      html += `<div class="card ${urgentClass}" style="cursor:pointer;transition:all .2s ease;" onclick="selectUrgentTask('${safeTitle}', ${index})">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <div style="font-weight:bold;color:${isUrgent ? '#dc2626' : '#374151'};">${urgentIcon}${task.emoji} ${task.title}</div>
              <div style="background:#f3f4f6;padding:2px 6px;border-radius:8px;font-size:12px;font-weight:bold;color:#059669;">${taskPoints}P</div>
            </div>
            <div style="font-size:14px;color:#6b7280;">${task.description || 'Keine Beschreibung'}</div>
            ${nextExecutionInfo}
          </div>
          <div style="text-align:right;">${isUrgent ? '<span style=\"background:#ef4444;color:#fff;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;\">DRINGEND</span>' : '<i class=\"fas fa-chevron-right\" style=\"color:#9ca3af;\"></i>'}</div>
        </div>
      </div>`;
    });
    if(tasks.length===0){
      html = '<div style="text-align:center;color:#6b7280;padding:20px;">Keine Tasks verfügbar</div>';
    }
    taskList.innerHTML = html;
    if(modal) modal.style.display='flex';
  }
  global.buildUrgentTaskList = buildUrgentTaskList;
})(window);
