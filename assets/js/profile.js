// Profile management overrides/extractions
// Keep small and focused: wire createNewProfile and loadDariusWG and expose them globally.
(function () {
  console.log('[profile.js] loaded');
  // Guard if already defined in window; keep latest here as source of truth
  function createNewProfile() {
    console.log('➕ Erstelle neues Profil (external)');

    // Neues Profil initialisieren
    window.currentProfileId = 'profile_' + Date.now();

    // Default-Werte zurücksetzen
    window.wgName = 'Meine WG';
    window.memberNames = [];
    window.memberProfiles = [];
    window.tasks = [];
    window.ratings = {};
    window.allRatings = {};
    window.absences = {};
    window.taskExecutions = {};

    // Setup-Workflow starten
    if (typeof window.showPhase === 'function') {
      // Phase 0: WG Setup (numeric normalization is handled inside showPhase)
      window.showPhase(0);
    }
    if (typeof window.showSuccessToast === 'function') {
      window.showSuccessToast('🆕 Neues WG-Profil wird erstellt');
    }
  }

  function loadDariusWG() {
    console.log('🚀 Lade vorkonfigurierte Darius WG (external)');

    window.currentProfileId = 'darius_wg_' + Date.now();

    if (typeof window.setupRealWG === 'function') {
      window.setupRealWG();
    } else {
      console.warn('setupRealWG is not available');
    }

    // Als Profil speichern
    setTimeout(() => {
      if (typeof window.saveCurrentProfile === 'function') {
        window.saveCurrentProfile();
      }
      if (typeof window.showSuccessToast === 'function') {
        window.showSuccessToast('🏠 Darius WG als Profil gespeichert!');
      }
    }, 1000);
  }

  // Expose
  window.createNewProfile = createNewProfile;
  window.loadDariusWG = loadDariusWG;
  console.log('[profile.js] globals exposed: createNewProfile, loadDariusWG');
})();
