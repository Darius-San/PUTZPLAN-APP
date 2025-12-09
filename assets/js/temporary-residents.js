// Temporary Residents Module (extracted from debug-demo.html)
// Handles adding, listing, and cleaning up temporary residents.

(function(){
  let temporaryResidents = [];

  function loadTemporaryResidents() {
    try {
      const saved = localStorage.getItem('temporaryResidents');
      if (saved) {
        temporaryResidents = JSON.parse(saved);
      }
    } catch (e) {
      console.error('❌ Error loading temporary residents:', e);
      temporaryResidents = [];
    }
  }

  function saveTemporaryResidents() {
    try {
      localStorage.setItem('temporaryResidents', JSON.stringify(temporaryResidents));
      if (typeof performAutoBackup === 'function') {
        performAutoBackup('temporary_residents');
      }
    } catch (e) {
      console.error('❌ Error saving temporary residents:', e);
    }
  }

  function isTemporaryPersonActive(tempResident, checkDate = new Date()) {
    const check = typeof checkDate === 'string' ? new Date(checkDate) : checkDate;
    const start = new Date(tempResident.startDate);
    const end = new Date(tempResident.endDate);
    return check >= start && check <= end;
  }

  function getActiveTemporaryResidents(date = new Date()) {
    const currentProfile = getCurrentProfileId && getCurrentProfileId();
    return temporaryResidents.filter(r => r.profileId === currentProfile && isTemporaryPersonActive(r, date));
  }

  function getAllTemporaryResidents() {
    const currentProfile = getCurrentProfileId && getCurrentProfileId();
    return temporaryResidents.filter(r => r.profileId === currentProfile);
  }

  function selectTempPersonIcon(icon) {
    window.selectedTempIcon = icon;
    const btns = document.querySelectorAll('.temp-icon-btn');
    btns.forEach(b => b.classList.remove('selected'));
    const active = document.querySelector(`[data-icon="${icon}"]`);
    if (active) active.classList.add('selected');
  }

  function addTemporaryPerson() {
    const nameEl = document.getElementById('tempPersonName');
    const startEl = document.getElementById('tempPersonStartDate');
    const endEl = document.getElementById('tempPersonEndDate');
    if (!nameEl || !startEl || !endEl) return;

    const name = nameEl.value.trim();
    const startDate = startEl.value;
    const endDate = endEl.value;
    const icon = window.selectedTempIcon || '👤';

    if (!name) { showErrorToast && showErrorToast('❌ Bitte geben Sie einen Namen ein'); return; }
    if (!startDate || !endDate) { showErrorToast && showErrorToast('❌ Bitte wählen Sie Start- und Enddatum'); return; }
    if (new Date(startDate) >= new Date(endDate)) { showErrorToast && showErrorToast('❌ Enddatum muss nach Startdatum liegen'); return; }

    const currentProfile = getCurrentProfileId && getCurrentProfileId();
    const profile = profiles && profiles[currentProfile];
    if (profile && profile.members.some(m => m.toLowerCase() === name.toLowerCase())) {
      showErrorToast && showErrorToast('❌ Name bereits als permanenter Bewohner vorhanden');
      return;
    }

    const tempResident = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2,11),
      name,
      icon,
      startDate,
      endDate,
      profileId: currentProfile,
      addedAt: new Date().toISOString()
    };

    temporaryResidents.push(tempResident);
    saveTemporaryResidents();

    nameEl.value = '';
    startEl.value = '';
    endEl.value = '';
    selectTempPersonIcon('👤');

    buildTemporaryResidentsList();
    updateDashboardStats && updateDashboardStats();
    showSuccessToast && showSuccessToast(`✅ ${name} als temporärer Bewohner hinzugefügt!`);
  }

  function buildTemporaryResidentsList() {
    const activeContainer = document.getElementById('temporaryPersonsList');
    const pastContainer = document.getElementById('pastTemporaryPersonsList');
    if (!activeContainer || !pastContainer) return;

    const all = getAllTemporaryResidents();
    const now = new Date();
    const active = all.filter(r => isTemporaryPersonActive(r, now));
    const past = all.filter(r => !isTemporaryPersonActive(r, now));

    if (active.length === 0) {
      activeContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#6b7280;"><i class='fas fa-user-clock' style='font-size:48px;margin-bottom:16px;opacity:.5;'></i><div>Keine aktiven temporären Bewohner</div></div>`;
    } else {
      let html = '<div style="display:grid;gap:12px;">';
      active.forEach(r => {
        const daysLeft = Math.ceil((new Date(r.endDate) - now) / 86400000);
        html += `<div class="card" style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-left:4px solid #10b981;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:24px;">${r.icon}</div>
              <div>
                <div class="font-bold" style="color:#065f46;">${r.name}</div>
                <div style="color:#047857;font-size:14px;">📅 ${new Date(r.startDate).toLocaleDateString()} - ${new Date(r.endDate).toLocaleDateString()}</div>
                <div style="color:#059669;font-size:12px;margin-top:4px;">⏰ Noch ${daysLeft} Tag${daysLeft!==1?'e':''}</div>
              </div>
            </div>
            <button onclick="removeTemporaryPerson('${r.id}')" class="btn btn-sm" style="background:#ef4444;color:#fff;padding:8px 12px;">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>`;
      });
      html += '</div>';
      activeContainer.innerHTML = html;
    }

    if (past.length === 0) {
      pastContainer.innerHTML = `<div style='text-align:center;padding:20px;color:#6b7280;'>Keine vergangenen temporären Bewohner</div>`;
    } else {
      let html = '<div style="display:grid;gap:8px;">';
      past.forEach(r => {
        html += `<div class="card" style="background:#f9fafb;border-left:4px solid #d1d5db;opacity:.8;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:20px;opacity:.6;">${r.icon}</div>
              <div>
                <div class="font-bold" style="color:#374151;">${r.name}</div>
                <div style="color:#6b7280;font-size:14px;">📅 ${new Date(r.startDate).toLocaleDateString()} - ${new Date(r.endDate).toLocaleDateString()}</div>
              </div>
            </div>
            <button onclick="removeTemporaryPerson('${r.id}')" class="btn btn-sm" style="background:#6b7280;color:#fff;padding:6px 10px;font-size:12px;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>`;
      });
      html += '</div>';
      pastContainer.innerHTML = html;
    }
  }

  function removeTemporaryPerson(id) {
    const res = temporaryResidents.find(r => r.id === id);
    if (!res) return;
    if (!confirm(`Möchten Sie ${res.name} wirklich aus der Liste entfernen?`)) return;
    temporaryResidents = temporaryResidents.filter(r => r.id !== id);
    saveTemporaryResidents();
    buildTemporaryResidentsList();
    updateDashboardStats && updateDashboardStats();
    showSuccessToast && showSuccessToast(`✅ ${res.name} entfernt`);
  }

  function calculateAdjustedTaskPoints(basePoints, date = new Date()) {
    const active = getActiveTemporaryResidents(date);
    if (active.length === 0) return basePoints;
    const multiplier = 1 + (active.length / 6);
    return Math.round(basePoints * multiplier);
  }

  function getAllMembersForDate(date = new Date()) {
    const currentProfile = getCurrentProfileId && getCurrentProfileId();
    const profile = profiles && profiles[currentProfile];
    if (!profile) return [];
    const permanent = profile.members.map(name => ({
      name,
      icon: profile.memberIcons ? profile.memberIcons[name] : '👤',
      isPermanent: true
    }));
    const activeTemp = getActiveTemporaryResidents(date).map(t => ({
      name: t.name,
      icon: t.icon,
      isPermanent: false,
      tempData: t
    }));
    return [...permanent, ...activeTemp];
  }

  function cleanupExpiredTemporaryResidents() {
    const now = new Date();
    const initial = temporaryResidents.length;
    const cutoff = new Date(now.getTime() - 30*24*60*60*1000);
    temporaryResidents = temporaryResidents.filter(r => new Date(r.endDate) >= cutoff);
    const removed = initial - temporaryResidents.length;
    if (removed>0) {
      console.log(`🧹 Auto-cleanup: ${removed} expired temporary residents removed`);
      saveTemporaryResidents();
      const phase = document.getElementById('temporaryResidents');
      if (phase && !phase.classList.contains('hidden')) buildTemporaryResidentsList();
    }
  }

  // Initial load
  loadTemporaryResidents();
  cleanupExpiredTemporaryResidents();
  setInterval(cleanupExpiredTemporaryResidents, 60*60*1000);

  // Expose API
  window.selectTempPersonIcon = selectTempPersonIcon;
  window.addTemporaryPerson = addTemporaryPerson;
  window.removeTemporaryPerson = removeTemporaryPerson;
  window.buildTemporaryResidentsList = buildTemporaryResidentsList;
  window.getActiveTemporaryResidents = getActiveTemporaryResidents;
  window.getAllTemporaryResidents = getAllTemporaryResidents;
  window.getAllMembersForDate = getAllMembersForDate;
  window.calculateAdjustedTaskPoints = calculateAdjustedTaskPoints;

  console.log('👥 Temporary Residents Module loaded');
})();
