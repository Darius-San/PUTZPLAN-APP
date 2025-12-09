// profile-overview.js - renders the rating user overview cards
(function(global){
  function buildUserOverview(){
    const container = document.getElementById('userOverviewList');
    if(!container) return;
    container.innerHTML='';
    const memberProfiles = global.memberProfiles || [];
    const tasks = global.tasks || [];
    const allRatings = global.allRatings || {};
    const userRatingsStatus = global.userRatingsStatus || {};

    memberProfiles.forEach((profile,index)=>{
      const hasCompletedRatings = allRatings[profile.name] && Object.keys(allRatings[profile.name]).length === tasks.length;
      const isCompleted = userRatingsStatus[profile.name] || hasCompletedRatings;
      const statusIcon = isCompleted ? '✅' : '⏳';
      const statusText = isCompleted ? 'Fertig bewertet' : 'Noch nicht bewertet';
      const buttonText = isCompleted ? 'Bewertungen ändern' : 'Jetzt bewerten';
      const card = document.createElement('div');
      card.className = `card ${isCompleted ? 'bg-green-50' : 'bg-gray-50'} mb-3`;
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:32px;">${profile.avatar}</div>
            <div>
              <h3 class="font-bold">${profile.name}</h3>
              <p class="text-gray-600">${profile.email || 'Keine E-Mail'}</p>
              <p class="text-sm ${isCompleted ? 'text-green-600' : 'text-gray-500'}">${statusIcon} ${statusText}</p>
            </div>
          </div>
          <button class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}" onclick="startRatingFor(${index})">${buttonText}</button>
        </div>`;
      container.appendChild(card);
    });
    const allCompleted = memberProfiles.every(p=>userRatingsStatus[p.name]);
    const startAllBtn = document.getElementById('startAllBtn');
    if(startAllBtn) startAllBtn.style.display = allCompleted ? 'block' : 'none';
  }
  global.buildUserOverview = buildUserOverview;
})(window);
