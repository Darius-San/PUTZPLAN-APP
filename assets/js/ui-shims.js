// ui-shims.js – minimal globals to keep debug-demo.html functional after JS extraction
(function(){
  console.log('[ui-shims.js] loaded');

  // Small helpers
  function safeHideAllPhases(){
    document.querySelectorAll('.phase').forEach(el => { if (el && el.classList) el.classList.add('hidden'); });
  }
  function safeShow(id){
    const el = document.getElementById(id);
    if (el && el.classList) el.classList.remove('hidden');
    else console.warn('[ui-shims] target not found:', id);
  }
  function toast(msg){ if (typeof window.showInfoToast === 'function') window.showInfoToast(msg); else console.log('[toast]', msg); }
  function success(msg){ if (typeof window.showSuccessToast === 'function') window.showSuccessToast(msg); else console.log('[ok]', msg); }
  function error(msg){ if (typeof window.showErrorToast === 'function') window.showErrorToast(msg); else console.error('[err]', msg); }

  // Navigation/page shims
  function showTaskTable(){ safeHideAllPhases(); safeShow('taskTable'); if (typeof window.buildTaskTable === 'function') window.buildTaskTable(); }
  function showTaskManagement(){ safeHideAllPhases(); safeShow('taskManagement'); if (typeof window.buildTaskManagementList === 'function') window.buildTaskManagementList(); else toast('Task-Verwaltung (vereinfachte Ansicht)'); }
  function showRatingOverview(){ safeHideAllPhases(); safeShow('ratingOverview'); toast('Bewertungs-Übersicht (vereinfacht)'); }
  function showRateTasks(){ safeHideAllPhases(); safeShow('rateTasks'); toast('Tasks bewerten (vereinfacht)'); }
  function showMasterOverview(){ safeHideAllPhases(); safeShow('masterOverview'); updateMasterOverview(); }
  function showProfileSelection(){ safeHideAllPhases(); safeShow('profileSelection'); }
  function nextPhase(id){
    try { let target = String(id); if (/^\d+$/.test(target)) target = `phase${target}`; window.showPhase ? window.showPhase(target) : (safeHideAllPhases(), safeShow(target)); }
    catch(e){ error('Fehler beim Wechsel der Phase'); console.error(e); }
  }

  // Simple data actions
  function refreshCurrentPage(){ location.reload(); }
  function clearAllProfiles(){ try { localStorage.clear(); window.memberProfiles = []; window.tasks = []; window.taskExecutions = {}; success('Alle lokalen Daten gelöscht.'); } catch(e){ error('Konnte Daten nicht löschen'); } }
  function exportProfiles(){ try { const data = JSON.stringify(window.profiles || {}, null, 2); downloadText(data, 'profiles.json'); success('Profile exportiert'); } catch(e){ error('Export fehlgeschlagen'); }}
  function exportAppData(){
    try {
      const payload = { wgName: window.wgName, memberProfiles: window.memberProfiles, tasks: window.tasks, taskExecutions: window.taskExecutions, absences: window.absences, profiles: window.profiles };
      downloadText(JSON.stringify(payload, null, 2), 'putzplan-export.json');
      success('App-Daten exportiert');
    } catch(e){ error('Export fehlgeschlagen'); }
  }
  function showBackupList(){ toast('Backups werden hier (vereinfacht) nicht gelistet.'); }
  function testAutoBackup(){ toast('Auto-Backup Test (Stub).'); }

  function downloadText(text, filename){
    const blob = new Blob([text], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // Demo setup helpers
  function setupRealWG(){
    window.wgName = 'WG Darius & Co';
    if (!Array.isArray(window.memberProfiles) || window.memberProfiles.length === 0) window.memberProfiles = (window.debugProfiles || []).slice();
    if (!Array.isArray(window.tasks) || window.tasks.length === 0) window.tasks = (window.debugTasks || []).slice();
    if (!window.taskExecutions) window.taskExecutions = {};
    window.memberProfiles.forEach(p=>{ if (!window.taskExecutions[p.name]) window.taskExecutions[p.name] = {}; window.tasks.forEach(t=>{ if (!window.taskExecutions[p.name][t.title]) window.taskExecutions[p.name][t.title]=[]; }); });
    success('Darius WG geladen');
    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
  }
  function completeAutoSetup(){ setupRealWG(); showDashboard(); }

  // Avatar/icon selection used in onboarding
  function selectAvatar(element, avatar){
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
    if (element && element.classList) element.classList.add('selected');
    window.selectedAvatar = avatar;
  }
  function selectAvatarIcon(element, iconClass){
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
    if (element && element.classList) element.classList.add('selected');
    window.selectedAvatar = `<i class="${iconClass}" style="font-size: 18px;"></i>`;
  }
  function toggleIconSelector(button){
    const taskItem = button.closest('.task-item');
    if (!taskItem) return;
    const selector = taskItem.querySelector('.extended-icon-selector');
    if (selector) selector.style.display = selector.style.display === 'none' ? '' : (selector.style.display ? '' : 'none');
  }

  // Icon/emoji pickers used across onboarding/task forms
  function selectIcon(element, iconClass, emoji){
    try {
      const container = element.parentElement;
      if (container) container.querySelectorAll('.emoji-option').forEach(el=>el.classList.remove('selected'));
      if (element && element.classList) element.classList.add('selected');
      // Update a nearby preview if present
      const preview = document.querySelector('#taskEmoji, #currentTaskEmoji, #modalTaskEmoji');
      if (preview && emoji) preview.textContent = emoji;
    } catch(e){ console.warn('[ui-shims] selectIcon fallback', e); }
  }
  function selectEmoji(element, emoji){
    try {
      const container = element.parentElement;
      if (container) container.querySelectorAll('.emoji-option').forEach(el=>el.classList.remove('selected'));
      if (element && element.classList) element.classList.add('selected');
      const preview = document.querySelector('#taskEmoji, #currentTaskEmoji, #modalTaskEmoji');
      if (preview && emoji) preview.textContent = emoji;
    } catch(e){ console.warn('[ui-shims] selectEmoji fallback', e); }
  }

  // Minimal stubs for rating and task mgmt flows
  function addTask(){ toast('Task hinzufügen (Stub)'); }
  function startAllRatings(){ toast('Alle Bewertungen starten (Stub)'); }
  function debugFillAllRatings(){ toast('Bewertungen automatisch füllen (Stub)'); }
  function nextTask(){ toast('Nächster Task (Stub)'); }
  function previousTask(){ toast('Vorheriger Task (Stub)'); }
  function cancelTaskRating(){ showDashboard(); }
  function calculateMonthlyPointsFromRatings(){ const pts = (typeof window.calculateMonthlyTargetPoints === 'function') ? window.calculateMonthlyTargetPoints() : 100; success(`Monatsziel geschätzt: ${pts}P`); }

  function saveTaskChanges(){ toast('Task-Änderungen gespeichert (Stub)'); }
  function toggleMinDays(taskId, enabled){
    // Legacy control; map to minDaysBetween when possible
    const value = enabled ? 3 : 0;
    const id = String(taskId);
    const task = (window.tasks||[]).find(t => t.id === id || t.title === id || t.key === id);
    if (task){ task.minDaysBetween = value; success(`Cooldown für "${task.title}" ${enabled?'aktiviert':'deaktiviert'}`); }
    if (typeof window.buildTaskTable === 'function') window.buildTaskTable();
  }
  function toggleTaskMinDays(taskIndex, enabled){
    const idx = Number(taskIndex);
    if (!isNaN(idx) && window.tasks && window.tasks[idx]){
      window.tasks[idx].minDaysBetween = enabled ? Math.max(1, window.tasks[idx].minDaysBetween || 3) : 0;
      success(`Cooldown ${enabled?'AN':'AUS'} für ${window.tasks[idx].title}`);
      const slider = document.getElementById(`taskMinDaysSlider_${idx}`);
      if (slider) slider.style.display = enabled ? '' : 'none';
      const val = document.getElementById(`taskMinDaysValue_${idx}`);
      if (val) val.textContent = String(window.tasks[idx].minDaysBetween || 1);
      if (typeof window.buildTaskTable === 'function') window.buildTaskTable();
    }
  }

  // Profiles edit stubs
  function addNewMember(){ toast('Mitglied hinzufügen (Stub)'); }
  function cancelProfileEdit(){ showDashboard(); }
  function saveProfileChanges(){ success('Profil gespeichert (Stub)'); }

  // Urgent tasks / extras
  function showUrgentTaskModal(){ alert('🚨 Dringende Tasks: (Stub)'); }
  function addRandomTaskExecution(){
    try{
      const members = window.memberProfiles||[];
      const tasks = window.tasks||[];
      if (members.length===0 || tasks.length===0){ error('Keine Mitglieder/Tasks für Demo'); return; }
      const m = members[Math.floor(Math.random()*members.length)];
      const t = tasks[Math.floor(Math.random()*tasks.length)];
      if (!window.taskExecutions[m.name]) window.taskExecutions[m.name] = {};
      if (!window.taskExecutions[m.name][t.title]) window.taskExecutions[m.name][t.title] = [];
      const points = (typeof window.calculateTaskPoints === 'function') ? window.calculateTaskPoints(t.title) : 10;
      window.taskExecutions[m.name][t.title].push({ id: Date.now()+"_demo", date: new Date().toISOString(), timestamp: Date.now(), points });
      success(`Demo-Ausführung: ${t.title} von ${m.name} (+${points}P)`);
      if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
    } catch(e){ error('Demo-Ausführung fehlgeschlagen'); }
  }

  function addDemoAbsences(){
    if (!window.absences) window.absences = {};
    const today = new Date();
    const twoDays = new Date(today); twoDays.setDate(today.getDate()+2);
    const sv = n => n.toString().padStart(2,'0');
    const d2s = d => `${d.getFullYear()}-${sv(d.getMonth()+1)}-${sv(d.getDate())}`;
    const u = (window.memberProfiles && window.memberProfiles[0]) ? window.memberProfiles[0].name : 'User1';
    window.absences[u] = window.absences[u]||[];
    window.absences[u].push({ reason:'vacation', startDate:d2s(today), endDate:d2s(twoDays), days:3, created:new Date().toISOString() });
    success('Demo-Abwesenheit hinzugefügt');
    if (typeof window.displayAbsenceList === 'function') window.displayAbsenceList();
    if (typeof window.buildAbsenceUserGrid === 'function') window.buildAbsenceUserGrid();
  }

  // Temporary residents (vereinfachte Version)
  function selectTempPersonIcon(icon){
    window.tempPersonIcon = icon;
    toast(`Icon gewählt: ${icon}`);
  }
  function addTemporaryPerson(){
    const nameInput = document.getElementById('tempPersonName');
    const noteInput = document.getElementById('tempPersonNotes');
    const name = nameInput ? nameInput.value.trim() : '';
    const icon = window.tempPersonIcon || '👤';
    if (!name){ error('Bitte Namen für temporäre Person eingeben'); return; }
    const list = document.getElementById('temporaryResidentsList');
    if (list){
      const item = document.createElement('div');
      item.className = 'temp-person-entry';
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;';
      item.innerHTML = `<span style="font-size:20px;">${icon}</span><strong>${name}</strong>${noteInput && noteInput.value ? `<span style="color:#6b7280;">– ${noteInput.value}</span>`:''}`;
      list.appendChild(item);
    }
    success(`Temporäre Person hinzugefügt: ${icon} ${name}`);
  }

  // Debug helpers used by buttons
  function debugFillAndSkip(){ setupRealWG(); showDashboard(); }
  function debugAutoRate(){ toast('Auto-Rate (Stub)'); }
  function debugFillAllData(){ setupRealWG(); success('Alle Demo-Daten gefüllt'); }

  // Master overview minimal updater
  function updateMasterOverview(){
    const nameEl = document.getElementById('masterWgName');
    const mEl = document.getElementById('masterMemberCount');
    const tEl = document.getElementById('masterTaskCount');
    const rEl = document.getElementById('masterRatingsCount');
    if (nameEl) nameEl.textContent = window.wgName || '-';
    if (mEl) mEl.textContent = (window.memberProfiles||[]).length;
    if (tEl) tEl.textContent = (window.tasks||[]).length;
    if (rEl) rEl.textContent = Object.values(window.taskExecutions||{}).reduce((sum,ut)=> sum + Object.values(ut||{}).reduce((s,a)=> s + (a||[]).length,0), 0);
  }

  // Expose
  window.showTaskTable = showTaskTable;
  window.showTaskManagement = showTaskManagement;
  window.showRatingOverview = showRatingOverview;
  window.showRateTasks = showRateTasks;
  window.showMasterOverview = showMasterOverview;
  window.showProfileSelection = showProfileSelection;
  window.nextPhase = nextPhase;
  window.refreshCurrentPage = refreshCurrentPage;
  window.clearAllProfiles = clearAllProfiles;
  window.exportProfiles = exportProfiles;
  window.exportAppData = exportAppData;
  window.showBackupList = showBackupList;
  window.testAutoBackup = testAutoBackup;
  window.setupRealWG = setupRealWG;
  window.completeAutoSetup = completeAutoSetup;
  window.selectAvatar = selectAvatar;
  window.selectAvatarIcon = selectAvatarIcon;
  window.toggleIconSelector = toggleIconSelector;
  window.selectIcon = selectIcon;
  window.selectEmoji = selectEmoji;
  window.addTask = addTask;
  window.startAllRatings = startAllRatings;
  window.debugFillAllRatings = debugFillAllRatings;
  window.nextTask = nextTask;
  window.previousTask = previousTask;
  window.cancelTaskRating = cancelTaskRating;
  window.calculateMonthlyPointsFromRatings = calculateMonthlyPointsFromRatings;
  window.saveTaskChanges = saveTaskChanges;
  window.toggleMinDays = toggleMinDays;
  window.toggleTaskMinDays = toggleTaskMinDays;
  window.addNewMember = addNewMember;
  window.cancelProfileEdit = cancelProfileEdit;
  window.saveProfileChanges = saveProfileChanges;
  window.showUrgentTaskModal = showUrgentTaskModal;
  window.addRandomTaskExecution = addRandomTaskExecution;
  window.addDemoAbsences = addDemoAbsences;
  window.selectTempPersonIcon = selectTempPersonIcon;
  window.addTemporaryPerson = addTemporaryPerson;
  window.debugFillAndSkip = debugFillAndSkip;
  window.debugAutoRate = debugAutoRate;
  window.debugFillAllData = debugFillAllData;
  window.updateMasterOverview = updateMasterOverview;

  console.log('[ui-shims.js] globals exposed');
})();
