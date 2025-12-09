// absence-list.js - extracted absence list rendering and actions from debug-demo.html
(function(global){
  function displayAbsenceList(){
    const list = document.getElementById('absenceList');
    const absences = global.absences || {};
    if(!list){ return; }
    if(Object.keys(absences).length===0){
      list.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">Noch keine Abwesenheiten eingetragen</div>';
      return;
    }
    let html='';
    Object.entries(absences).forEach(([userName,userAbsences])=>{
      userAbsences.forEach((absence,index)=>{
        const reasonIcons={ vacation:'🏖️ Urlaub', work:'💼 Geschäftsreise', family:'👨‍👩‍👧‍👦 Familie'};
        html += `<div class="absence-entry ${absence.reason}">\n`+
          `<div>\n`+
          `<div style=\"font-weight:600;\">${userName} • ${reasonIcons[absence.reason] || '❓ Unbekannt'}<\/div>\n`+
          `<div style=\"font-size:13px;color:#6b7280;\">${formatDate(absence.startDate)} - ${formatDate(absence.endDate)} (${absence.days} Tage)<\/div>\n`+
          `</div>\n`+
          `<div style=\"display:flex;gap:8px;\">\n`+
          `<button onclick=\"editAbsence('${userName.replace(/'/g,"\\'")}', ${index})\" style=\"background:none;border:none;color:#3b82f6;cursor:pointer;padding:4px;\" title=\"Bearbeiten\"><i class=\"fas fa-edit\"></i></button>\n`+
          `<button onclick=\"deleteAbsence('${userName.replace(/'/g,"\\'")}', ${index})\" style=\"background:none;border:none;color:#ef4444;cursor:pointer;padding:4px;\" title=\"Löschen\"><i class=\"fas fa-trash\"></i></button>\n`+
          `</div>\n`+
          `</div>`;
      });
    });
    list.innerHTML = html;
  }

  function deleteAbsence(userName,index){
    const absences = global.absences || {};
    try {
      if(confirm(`Abwesenheit von ${userName} wirklich löschen?`)){
        if(absences[userName] && absences[userName][index]){
          absences[userName].splice(index,1);
          if(absences[userName].length===0){ delete absences[userName]; }
          if(typeof global.saveCurrentState==='function') global.saveCurrentState();
          displayAbsenceList();
          if(typeof global.buildAbsenceUserGrid==='function') global.buildAbsenceUserGrid();
          if(typeof global.showSuccessToast==='function') global.showSuccessToast('Abwesenheit gelöscht');
        } else {
          alert('❌ Abwesenheit nicht gefunden!');
        }
      }
    } catch(e){
      console.error('❌ Fehler beim Löschen:', e);
      alert('❌ Fehler beim Löschen der Abwesenheit: '+ e.message);
    }
  }

  global.displayAbsenceList = displayAbsenceList;
  global.deleteAbsence = deleteAbsence;
})(window);
