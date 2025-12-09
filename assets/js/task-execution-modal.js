// task-execution-modal.js - extracted user grid rendering for task execution modal
(function(global){
  function renderTaskExecutionUserGrid(){
    const userGrid = document.getElementById('modalUserGrid');
    if(!userGrid || !Array.isArray(global.memberProfiles)) return;
    userGrid.innerHTML = global.memberProfiles.map((profile,index)=>
      `<div class=\"user-card\" data-user-index=\"${index}\" onclick=\"selectUser(${index})\">`+
      `<div class=\"user-avatar\">${profile.avatar}</div>`+
      `<div class=\"user-name\">${profile.name}</div>`+
      `</div>`
    ).join('');
  }
  global.renderTaskExecutionUserGrid = renderTaskExecutionUserGrid;
})(window);
