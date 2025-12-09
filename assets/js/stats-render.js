// Renders monthly performance overview cards
(function(global){
  'use strict';

  function renderMonthlyPerformance(){
    const container = document.getElementById('monthlyPerformanceOverview');
    if(!container) return;
    const memberProfiles = global.memberProfiles || [];
    const taskExecutions = global.taskExecutions || {};
    const pastMonths = global.pastMonths || [];
    let html = '';

    if(!pastMonths.length){
      container.innerHTML = '<div class="text-sm text-gray-500">Keine Monatsdaten vorhanden.</div>';
      return;
    }

    pastMonths.forEach(month => {
      const targetPoints = 100; // could be configurable later
      html += `<div class="card mb-4" style="padding:16px;border-left:4px solid #3b82f6;">`;
      html += `<h5 class="font-bold mb-3">${month.name}</h5>`;
      html += `<div style="display:grid;gap:8px;">`;

      memberProfiles.forEach(profile => {
        const userName = profile.name;
        let monthPoints = 0;
        const userExec = taskExecutions[userName] || {};
        Object.entries(userExec).forEach(([taskTitle, executions]) => {
          executions.forEach(exec => {
            const d = new Date(exec.date);
            if(d >= month.start && d <= month.end){
              monthPoints += (exec.points || 0);
            }
          });
        });
        const percentage = targetPoints > 0 ? Math.round((monthPoints / targetPoints) * 100) : 0;
        const achieved = percentage >= 80;
        const statusIcon = achieved ? '✅' : '❌';
        const statusColor = achieved ? '#10b981' : '#ef4444';
        const statusBg = achieved ? '#f0fdf4' : '#fef2f2';
        const borderColor = achieved ? '#dcfce7' : '#fee2e2';

        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${statusBg};border-radius:6px;border:1px solid ${borderColor};">`;
        html += `<div style="display:flex;align-items:center;gap:8px;">`;
        html += `<span style=\"font-size:18px;\">${profile.avatar}</span>`;
        html += `<span class=\"font-medium\">${userName}</span>`;
        html += `<span>${statusIcon}</span>`;
        html += `</div>`;
        html += `<div style=\"text-align:right;\"><span class=\"font-bold\" style=\"color:${statusColor};\">${monthPoints}P</span><span class=\"text-sm text-gray-500\"> (${percentage}%)</span></div>`;
        html += `</div>`;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;
  }

  global.renderMonthlyPerformance = renderMonthlyPerformance;
})(window);
