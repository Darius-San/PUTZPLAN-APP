// state-restore.js – handles preserving visible phase across a manual page refresh
// Lightweight extraction from the previously inlined snapshot block.
(function(){
  console.log('[state-restore.js] loaded');

  // Ensure navigationHistory exists
  if (!window.navigationHistory) window.navigationHistory = [];

  function refreshCurrentPage() {
    try {
      const currentPhase = document.querySelector('.phase:not(.hidden)');
      const currentPhaseId = currentPhase ? currentPhase.id : 'profileSelection';
      const refreshState = {
        currentPhase: currentPhaseId,
        navigationHistory: [...window.navigationHistory],
        timestamp: Date.now()
      };
      localStorage.setItem('refreshState', JSON.stringify(refreshState));
      location.reload();
    } catch (e) {
      console.warn('[state-restore] refreshCurrentPage failed', e);
      location.reload();
    }
  }

  function restoreStateAfterRefresh() {
    try {
      const raw = localStorage.getItem('refreshState');
      if (!raw) return;
      const refreshState = JSON.parse(raw);
      if (!refreshState || !refreshState.timestamp) return;
      if (Date.now() - refreshState.timestamp > 5000) { // stale
        localStorage.removeItem('refreshState');
        return;
      }
      window.navigationHistory = refreshState.navigationHistory || [];

      if (refreshState.currentPhase && refreshState.currentPhase !== 'profileSelection') {
        document.querySelectorAll('.phase').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(refreshState.currentPhase);
        if (target) target.classList.remove('hidden');
      }
      localStorage.removeItem('refreshState');
    } catch (e) {
      console.warn('[state-restore] restoreStateAfterRefresh failed', e);
    }
  }

  // Expose
  window.refreshCurrentPage = window.refreshCurrentPage || refreshCurrentPage;
  window.restoreStateAfterRefresh = restoreStateAfterRefresh;
  document.addEventListener('DOMContentLoaded', restoreStateAfterRefresh);
})();
