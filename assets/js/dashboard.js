// dashboard.js – extract dashboard rendering and stats updates
(function(){
  console.log('[dashboard.js] loaded');

  function showDashboard() {
    try {
      // Hide all phases safely
      document.querySelectorAll('.phase').forEach(el => {
        if (el && el.classList) el.classList.add('hidden');
      });
      // Show dashboard phase
      const dash = document.getElementById('phaseComplete');
      if (dash && dash.classList) dash.classList.remove('hidden');

      // Update WG name
      const dashboardWgName = document.getElementById('dashboardWgName');
      if (dashboardWgName) {
        dashboardWgName.textContent = window.wgName || dashboardWgName.textContent || '';
      }

      // Initialize taskExecutions if needed
      if (!window.taskExecutions) window.taskExecutions = {};
      if (Object.keys(window.taskExecutions).length === 0 && Array.isArray(window.memberProfiles)) {
        window.memberProfiles.forEach(profile => {
          if (!window.taskExecutions[profile.name]) window.taskExecutions[profile.name] = {};
          (window.tasks || []).forEach(task => {
            if (!window.taskExecutions[profile.name][task.title]) {
              window.taskExecutions[profile.name][task.title] = [];
            }
          });
        });
      }

      updateDashboardStats();
      updatePendingRatingsBadge();
    } catch (e) {
      console.error('[dashboard.js] showDashboard error:', e);
    }
  }

  function updatePendingRatingsBadge() {
    try {
      const currentUser = (typeof window.getCurrentUser === 'function') ? window.getCurrentUser() : null;
      let pendingCount = 0;

      const canRate = (typeof window.canUserRateTask === 'function') ? window.canUserRateTask : () => false;

      Object.entries(window.taskExecutions || {}).forEach(([userName, userTasks]) => {
        if (currentUser && userName === currentUser) return; // Skip own tasks
        Object.entries(userTasks || {}).forEach(([taskName, executions]) => {
          (executions || []).forEach(execution => {
            if (execution && execution.id && canRate(execution.id)) pendingCount++;
          });
        });
      });

      const badge = document.getElementById('pendingRatingsBadge');
      if (badge) {
        if (pendingCount > 0) {
          badge.style.display = 'inline';
          badge.textContent = String(pendingCount);
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (e) {
      console.error('[dashboard.js] updatePendingRatingsBadge error:', e);
    }
  }

  function updateDashboardStats() {
    try {
      // Tasks count
      const totalTasksElement = document.getElementById('totalTasksCount');
      if (totalTasksElement) totalTasksElement.textContent = (window.tasks || []).length;

      // Completed today
      const today = new Date().toDateString();
      let todayCount = 0;
      Object.values(window.taskExecutions || {}).forEach(userTasks => {
        Object.values(userTasks || {}).forEach(executions => {
          todayCount += (executions || []).filter(exec => new Date(exec.date).toDateString() === today).length;
        });
      });
      const todayElement = document.getElementById('completedTasksToday');
      if (todayElement) todayElement.textContent = String(todayCount);

      // Rebuild task table if visible
      const taskTablePhase = document.getElementById('taskTable');
      if (taskTablePhase && !taskTablePhase.classList.contains('hidden') && typeof window.buildTaskTable === 'function') {
        window.buildTaskTable();
      }

      // Rebuild task management if visible
      const taskManagementPhase = document.getElementById('taskManagement');
      if (taskManagementPhase && !taskManagementPhase.classList.contains('hidden') && typeof window.buildTaskManagementList === 'function') {
        window.buildTaskManagementList();
      }

      // Update period info if on dashboard
      const dashboardPhase = document.getElementById('phaseComplete');
      if (dashboardPhase && !dashboardPhase.classList.contains('hidden') && typeof window.updatePeriodInfo === 'function') {
        window.updatePeriodInfo();
      }

      // Update temporary residents list if that page is visible
      const tempResidentsPhase = document.getElementById('temporaryResidents');
      if (tempResidentsPhase && !tempResidentsPhase.classList.contains('hidden') && typeof window.buildTemporaryResidentsList === 'function') {
        window.buildTemporaryResidentsList();
      }
    } catch (e) {
      console.error('[dashboard.js] updateDashboardStats error:', e);
    }
  }

  // Expose
  window.showDashboard = showDashboard;
  window.updateDashboardStats = updateDashboardStats;
  window.updatePendingRatingsBadge = updatePendingRatingsBadge;
  console.log('[dashboard.js] globals exposed: showDashboard, updateDashboardStats, updatePendingRatingsBadge');
})();
