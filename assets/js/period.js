// period.js – extract period settings and helpers
(function(){
  console.log('[period.js] loaded');

  function loadPeriodDates() {
    const settings = localStorage.getItem('periodSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.startDate && parsed.endDate) {
        const s = document.getElementById('periodStartDate');
        const e = document.getElementById('periodEndDate');
        if (s) s.value = parsed.startDate;
        if (e) e.value = parsed.endDate;
        return;
      }
    }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const s = document.getElementById('periodStartDate');
    const e = document.getElementById('periodEndDate');
    if (s) s.value = startOfMonth.toISOString().split('T')[0];
    if (e) e.value = endOfMonth.toISOString().split('T')[0];
  }

  function savePeriodDates() {
    const s = document.getElementById('periodStartDate');
    const e = document.getElementById('periodEndDate');
    const startDate = s ? s.value : '';
    const endDate = e ? e.value : '';
    if (!startDate || !endDate) { alert('Bitte wähle sowohl Start- als auch Enddatum aus.'); return; }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) { alert('Das Enddatum muss nach dem Startdatum liegen.'); return; }
    localStorage.setItem('periodSettings', JSON.stringify({ startDate, endDate }));
    if (typeof updatePeriodDisplay === 'function') updatePeriodDisplay();
    if (typeof updateDashboardStats === 'function') updateDashboardStats();

    const saveButton = document.querySelector('button[onclick="savePeriodDates()"]');
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = '✅ Gespeichert!';
      saveButton.style.background = '#10b981';
      setTimeout(() => { saveButton.textContent = originalText; saveButton.style.background = ''; }, 2000);
    }
  }

  function resetPeriodDates() {
    localStorage.removeItem('periodSettings');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const s = document.getElementById('periodStartDate');
    const e = document.getElementById('periodEndDate');
    if (s) s.value = startOfMonth.toISOString().split('T')[0];
    if (e) e.value = endOfMonth.toISOString().split('T')[0];
    if (typeof updatePeriodDisplay === 'function') updatePeriodDisplay();
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
  }

  function getCurrentPeriod() {
    const settings = localStorage.getItem('periodSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.startDate && parsed.endDate) {
        const start = new Date(parsed.startDate);
        const end = new Date(parsed.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return { start, end, days };
      }
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return { start, end, days };
  }

  function updatePeriodInfo() {
    const period = getCurrentPeriod();
    const options = { day: 'numeric', month: 'long' };
    const startStr = period.start.toLocaleDateString('de-DE', options);
    const endStr = period.end.toLocaleDateString('de-DE', options);
    const currentPeriodInfo = document.getElementById('currentPeriodInfo');
    if (currentPeriodInfo) currentPeriodInfo.textContent = `${startStr} - ${endStr} (${period.days} Tage)`;
    const totalTargetPoints = 100;
    const dailyAverage = (totalTargetPoints / period.days).toFixed(1);
    const dailyAverageInfo = document.getElementById('dailyAverageInfo');
    if (dailyAverageInfo) dailyAverageInfo.textContent = `${dailyAverage} Punkte`;
  }

  function showPeriodSettings() {
    document.querySelectorAll('.phase').forEach(el => { if (el && el.classList) el.classList.add('hidden'); });
    const section = document.getElementById('periodSettings');
    if (section && section.classList) section.classList.remove('hidden');
    loadPeriodDates();
    if (typeof updatePeriodDisplay === 'function') updatePeriodDisplay();
  }

  function updatePeriodDisplay() {
    const period = getCurrentPeriod();
    const options = { day: 'numeric', month: 'long' };
    const startStr = period.start.toLocaleDateString('de-DE', options);
    const endStr = period.end.toLocaleDateString('de-DE', options);
    const currentPeriodDisplay = document.getElementById('currentPeriodDisplay');
    if (currentPeriodDisplay) currentPeriodDisplay.textContent = `${startStr} - ${endStr} (${period.days} Tage)`;
    const totalTargetPoints = 100;
    const dailyAverage = (totalTargetPoints / period.days).toFixed(1);
    const dailyAverageDisplay = document.getElementById('dailyAverageDisplay');
    if (dailyAverageDisplay) dailyAverageDisplay.textContent = `${dailyAverage} Punkte`;
  }

  function setPeriodPreset(preset) {
    const now = new Date();
    let startDate, endDate;
    switch (preset) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'nextMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        break;
      case '4weeks':
        startDate = new Date(now);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        break;
      case '2weeks':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        break;
    }
    const s = document.getElementById('periodStartDate');
    const e = document.getElementById('periodEndDate');
    if (s) s.value = startDate.toISOString().split('T')[0];
    if (e) e.value = endDate.toISOString().split('T')[0];
    updatePeriodDisplay();
  }

  // Expose
  window.loadPeriodDates = loadPeriodDates;
  window.savePeriodDates = savePeriodDates;
  window.resetPeriodDates = resetPeriodDates;
  window.getCurrentPeriod = getCurrentPeriod;
  window.updatePeriodInfo = updatePeriodInfo;
  window.updatePeriodDisplay = updatePeriodDisplay;
  window.showPeriodSettings = showPeriodSettings;
  window.setPeriodPreset = setPeriodPreset;
  console.log('[period.js] globals exposed: loadPeriodDates, savePeriodDates, resetPeriodDates, getCurrentPeriod, updatePeriodInfo, updatePeriodDisplay, showPeriodSettings, setPeriodPreset');
})();
