// absences.js – extract absence manager and CRUD
(function(){
  console.log('[absences.js] loaded');

  // Globals
  if (!window.absences) window.absences = {};
  let selectedAbsenceUser = null;
  let editingAbsence = null;

  function isUserCurrentlyAbsent(userName) {
    const today = new Date();
    const userAbsences = window.absences[userName] || [];
    return userAbsences.some(absence => {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      return today >= startDate && today <= endDate;
    });
  }

  function getGoneFishingSymbol() {
    const symbols = ['🎣', '🏖️', '✈️', '🌴', '⛵', '🍹', '😎'];
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function showAbsenceManager() {
    try {
      if (!Array.isArray(window.memberProfiles) || window.memberProfiles.length === 0) {
        window.memberProfiles = window.debugProfiles || window.memberProfiles || [];
      }
      document.querySelectorAll('.phase').forEach(el => { if (el && el.classList) el.classList.add('hidden'); });
      const el = document.getElementById('absenceManager');
      if (el) el.classList.remove('hidden');
      buildAbsenceUserGrid();
      displayAbsenceList();

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const s = document.getElementById('absenceStartDate');
      const e = document.getElementById('absenceEndDate');
      if (s) s.value = today.toISOString().split('T')[0];
      if (e) e.value = tomorrow.toISOString().split('T')[0];

      setTimeout(() => {
        const startDateInput = document.getElementById('absenceStartDate');
        const endDateInput = document.getElementById('absenceEndDate');
        if (startDateInput && endDateInput) {
          startDateInput.addEventListener('change', updateAbsenceCalculation);
          endDateInput.addEventListener('change', updateAbsenceCalculation);
        }
      }, 100);
    } catch (e) {
      console.error('[absences.js] showAbsenceManager error:', e);
      alert('❌ Fehler beim Öffnen der Abwesenheits-Verwaltung: ' + e.message);
    }
  }

  function buildAbsenceUserGrid() {
    const grid = document.getElementById('absenceUserGrid');
    if (!grid) return;
    grid.className = 'absence-user-grid';
    grid.innerHTML = (window.memberProfiles || []).map(profile => `
      <div class="absence-user-card" onclick="selectAbsenceUser('${profile.name}', this)">
        <div style="font-size: 32px; margin-bottom: 4px;">${profile.avatar || '👤'}</div>
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${profile.name}</div>
        <div style="font-size: 11px; color: #6b7280;">${getAbsenceDaysThisMonth(profile.name)} Tage</div>
      </div>
    `).join('');
  }

  function selectAbsenceUser(userName, element) {
    document.querySelectorAll('.absence-user-card').forEach(el => el.classList.remove('selected'));
    if (element && element.classList) element.classList.add('selected');
    selectedAbsenceUser = userName;
    const sel = document.getElementById('absenceDateSelection');
    if (sel) sel.classList.remove('hidden');
    updateAbsenceCalculation();
  }

  function updateAbsenceCalculation() {
    const startDate = document.getElementById('absenceStartDate')?.value;
    const endDate = document.getElementById('absenceEndDate')?.value;
    if (startDate && endDate && selectedAbsenceUser) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) {
        const monthlyTarget = (typeof window.calculateMonthlyTargetPoints === 'function') ? window.calculateMonthlyTargetPoints() : 100;
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const dailyTarget = monthlyTarget / daysInMonth;
        const reductionPoints = Math.round(dailyTarget * days);
        const newTarget = Math.max(0, monthlyTarget - reductionPoints);
        const summary = document.getElementById('absenceSummary');
        if (summary) {
          summary.classList.remove('hidden');
          const impact = document.getElementById('absenceImpact');
          if (impact) {
            impact.innerHTML = `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 14px;">
                <div><strong>${days}</strong> Tage abwesend</div>
                <div><strong>-${reductionPoints}P</strong> Reduktion</div>
                <div><strong>${newTarget}P</strong> neues Ziel</div>
              </div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">
                Ursprüngliches Monatsziel: ${monthlyTarget}P • Täglicher Durchschnitt: ${Math.round(dailyTarget)}P
              </div>`;
          }
        }
      }
    }
  }

  function saveAbsence() {
    try {
      const startDate = document.getElementById('absenceStartDate')?.value;
      const endDate = document.getElementById('absenceEndDate')?.value;
      const reason = document.getElementById('absenceReason')?.value;
      if (!selectedAbsenceUser || !startDate || !endDate) { alert('Bitte fülle alle Felder aus!'); return; }
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (days <= 0) { alert('Das End-Datum muss nach dem Start-Datum liegen!'); return; }
      if (!window.absences[selectedAbsenceUser]) window.absences[selectedAbsenceUser] = [];

      if (editingAbsence) {
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        const overlapping = window.absences[selectedAbsenceUser].find((existing, idx) => {
          if (idx === editingAbsence.index) return false;
          const existingStart = new Date(existing.startDate);
          const existingEnd = new Date(existing.endDate);
          return (newStart <= existingEnd && newEnd >= existingStart);
        });
        if (overlapping) {
          const overlapStart = new Date(overlapping.startDate).toLocaleDateString('de-DE');
          const overlapEnd = new Date(overlapping.endDate).toLocaleDateString('de-DE');
          alert(`❌ Zeitraum-Überschneidung!\n\nDer neue Zeitraum überschneidet sich mit:\n${overlapStart} - ${overlapEnd} (${overlapping.reason})\n\nBitte wähle einen anderen Zeitraum.`);
          return;
        }
        window.absences[selectedAbsenceUser][editingAbsence.index] = {
          reason, startDate, endDate, days,
          created: window.absences[selectedAbsenceUser][editingAbsence.index].created,
          updated: new Date().toISOString()
        };
        showSuccessToast && showSuccessToast(`✅ Abwesenheit von ${selectedAbsenceUser} aktualisiert (${days} Tage)`);
        editingAbsence = null;
      } else {
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        const overlapping = window.absences[selectedAbsenceUser].find(existing => {
          const existingStart = new Date(existing.startDate);
          const existingEnd = new Date(existing.endDate);
          return (newStart <= existingEnd && newEnd >= existingStart);
        });
        if (overlapping) {
          const overlapStart = new Date(overlapping.startDate).toLocaleDateString('de-DE');
          const overlapEnd = new Date(overlapping.endDate).toLocaleDateString('de-DE');
          alert(`❌ Zeitraum-Überschneidung!\n\nDer neue Zeitraum überschneidet sich mit:\n${overlapStart} - ${overlapEnd} (${overlapping.reason})\n\nBitte wähle einen anderen Zeitraum.`);
          return;
        }
        window.absences[selectedAbsenceUser].push({ reason, startDate, endDate, days, created: new Date().toISOString() });
        showSuccessToast && showSuccessToast(`✅ Abwesenheit für ${selectedAbsenceUser} gespeichert (${days} Tage)`);
      }
      saveCurrentState && saveCurrentState();
      cancelAbsenceEntry();
      displayAbsenceList();
      buildAbsenceUserGrid();
    } catch (e) {
      console.error('[absences.js] saveAbsence error:', e);
      alert('❌ Fehler beim Speichern der Abwesenheit: ' + e.message);
    }
  }

  function cancelAbsenceEntry() {
    selectedAbsenceUser = null;
    editingAbsence = null;
    const sel = document.getElementById('absenceDateSelection');
    const sum = document.getElementById('absenceSummary');
    if (sel) sel.classList.add('hidden');
    if (sum) sum.classList.add('hidden');
    document.querySelectorAll('.absence-user-card').forEach(el => el.classList.remove('selected'));
    const saveButton = document.querySelector('button[onclick="saveAbsence()"]');
    if (saveButton) { saveButton.innerHTML = 'Abwesenheit speichern'; saveButton.style.background = ''; }
  }

  function displayAbsenceList() {
    const list = document.getElementById('absenceList');
    if (!list) return;
    if (Object.keys(window.absences).length === 0) {
      list.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">Noch keine Abwesenheiten eingetragen</div>';
      return;
    }
    let html = '';
    Object.entries(window.absences).forEach(([userName, userAbsences]) => {
      userAbsences.forEach((absence, index) => {
        const reasonIcons = { vacation: '🏖️ Urlaub', work: '💼 Geschäftsreise', family: '👨‍👩‍👧‍👦 Familie' };
        html += `
        <div class="absence-entry ${absence.reason}">
          <div>
            <div style="font-weight: 600;">${userName} • ${reasonIcons[absence.reason] || '❓ Unbekannt'}</div>
            <div style="font-size: 13px; color: #6b7280;">${formatDate(absence.startDate)} - ${formatDate(absence.endDate)} (${absence.days} Tage)</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="editAbsence(\"${userName}\", ${index})" style="background: none; border: none; color: #3b82f6; cursor: pointer; padding: 4px;" title="Bearbeiten"><i class="fas fa-edit"></i></button>
            <button onclick="deleteAbsence(\"${userName}\", ${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;" title="Löschen"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
      });
    });
    list.innerHTML = html;
  }

  function deleteAbsence(userName, index) {
    try {
      if (confirm(`Abwesenheit von ${userName} wirklich löschen?`)) {
        if (window.absences[userName] && window.absences[userName][index]) {
          window.absences[userName].splice(index, 1);
          if (window.absences[userName].length === 0) delete window.absences[userName];
          saveCurrentState && saveCurrentState();
          displayAbsenceList();
          buildAbsenceUserGrid();
          showSuccessToast && showSuccessToast('Abwesenheit gelöscht');
        } else {
          alert('❌ Abwesenheit nicht gefunden!');
        }
      }
    } catch (e) {
      console.error('[absences.js] deleteAbsence error:', e);
      alert('❌ Fehler beim Löschen der Abwesenheit: ' + e.message);
    }
  }

  function editAbsence(userName, index) {
    try {
      if (!window.absences[userName] || !window.absences[userName][index]) { alert('❌ Abwesenheit nicht gefunden!'); return; }
      const absence = window.absences[userName][index];
      editingAbsence = { userName, index };
      const card = document.querySelector(`.absence-user-card[onclick*="${userName}"]`);
      selectAbsenceUser(userName, card);
      const s = document.getElementById('absenceStartDate');
      const e = document.getElementById('absenceEndDate');
      const r = document.getElementById('absenceReason');
      if (s) s.value = absence.startDate;
      if (e) e.value = absence.endDate;
      if (r) r.value = absence.reason;
      updateAbsenceCalculation();
      const saveButton = document.querySelector('button[onclick="saveAbsence()"]');
      if (saveButton) { saveButton.innerHTML = 'Änderungen speichern'; saveButton.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; }
      showSuccessToast && showSuccessToast(`✏️ Bearbeite Abwesenheit von ${userName}`);
    } catch (e) {
      console.error('[absences.js] editAbsence error:', e);
      alert('❌ Fehler beim Bearbeiten der Abwesenheit: ' + e.message);
    }
  }

  function getAbsenceDaysThisMonth(userName) {
    if (!window.absences[userName]) return 0;
    const period = (typeof window.getCurrentPeriod === 'function') ? window.getCurrentPeriod() : { start: new Date(), end: new Date(), days: 30 };
    return window.absences[userName].reduce((total, absence) => {
      const start = new Date(absence.startDate);
      const end = new Date(absence.endDate);
      if ((start <= period.end && end >= period.start)) {
        const overlapStart = new Date(Math.max(start.getTime(), period.start.getTime()));
        const overlapEnd = new Date(Math.min(end.getTime(), period.end.getTime()));
        const overlapDays = Math.max(0, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1);
        return total + overlapDays;
      }
      return total;
    }, 0);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function cleanupDuplicateAbsences() {
    let removedCount = 0;
    Object.keys(window.absences).forEach(userName => {
      const userAbsences = window.absences[userName];
      const unique = [];
      userAbsences.forEach(absence => {
        const isDuplicate = unique.some(existing => existing.startDate === absence.startDate && existing.endDate === absence.endDate && existing.reason === absence.reason);
        if (!isDuplicate) unique.push(absence); else removedCount++;
      });
      window.absences[userName] = unique;
    });
    if (removedCount > 0) {
      saveCurrentState && saveCurrentState();
      displayAbsenceList();
      buildAbsenceUserGrid();
      showSuccessToast && showSuccessToast(`🧹 ${removedCount} doppelte Einträge entfernt`);
    } else {
      showSuccessToast && showSuccessToast('✅ Keine doppelten Einträge gefunden');
    }
  }

  // Expose
  window.showAbsenceManager = showAbsenceManager;
  window.buildAbsenceUserGrid = buildAbsenceUserGrid;
  window.selectAbsenceUser = selectAbsenceUser;
  window.updateAbsenceCalculation = updateAbsenceCalculation;
  window.saveAbsence = saveAbsence;
  window.cancelAbsenceEntry = cancelAbsenceEntry;
  window.displayAbsenceList = displayAbsenceList;
  window.deleteAbsence = deleteAbsence;
  window.editAbsence = editAbsence;
  window.getAbsenceDaysThisMonth = getAbsenceDaysThisMonth;
  window.formatDate = formatDate;
  window.cleanupDuplicateAbsences = cleanupDuplicateAbsences;
  window.isUserCurrentlyAbsent = isUserCurrentlyAbsent;
  window.getGoneFishingSymbol = getGoneFishingSymbol;
  console.log('[absences.js] globals exposed: showAbsenceManager, saveAbsence, editAbsence, deleteAbsence, …');
})();
