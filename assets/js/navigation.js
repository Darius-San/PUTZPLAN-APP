// navigation.js – extract and harden navigation helpers
(function(){
  console.log('[navigation.js] loaded');

  // Maintain a navigation history compatible with existing code
  if (!window.navigationHistory) {
    window.navigationHistory = [];
  }

  function showPhase(phaseId) {
    try {
      let targetId = String(phaseId);
      if (/^\d+$/.test(targetId)) targetId = `phase${targetId}`;

      const currentPhase = document.querySelector('.phase:not(.hidden)');
      if (currentPhase && currentPhase.id) window.navigationHistory.push(currentPhase.id);

      document.querySelectorAll('.phase').forEach(el => {
        if (el && el.classList) el.classList.add('hidden');
      });

      const target = document.getElementById(targetId);
      if (target && target.classList) target.classList.remove('hidden');
      else console.warn('[navigation.js] showPhase(): target not found', targetId);

      if (targetId === 'temporaryResidents') {
        if (typeof window.buildTemporaryResidentsList === 'function') window.buildTemporaryResidentsList();
        if (typeof window.selectTempPersonIcon === 'function') window.selectTempPersonIcon('👤');
      }
    } catch (e) {
      console.error('[navigation.js] showPhase error:', e);
    }
  }

  function goBack() {
    try {
      if (window.navigationHistory && window.navigationHistory.length > 0) {
        const previousPhase = window.navigationHistory.pop();
        document.querySelectorAll('.phase').forEach(el => { if (el && el.classList) el.classList.add('hidden'); });
        const prevEl = document.getElementById(previousPhase);
        if (prevEl && prevEl.classList) prevEl.classList.remove('hidden');
        else console.warn('[navigation.js] goBack(): previous phase not found', previousPhase);
      } else if (typeof window.showDashboard === 'function') {
        window.showDashboard();
      }
    } catch (e) {
      console.error('[navigation.js] goBack error:', e);
      if (typeof window.showDashboard === 'function') window.showDashboard();
    }
  }

  // Expose
  window.showPhase = showPhase;
  window.goBack = goBack;
  console.log('[navigation.js] globals exposed: showPhase, goBack');
})();
