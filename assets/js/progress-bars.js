// Progress bar rendering utilities extracted from inline HTML
(function(global){
  'use strict';

  function setBarWidth(el, pct){
    if(!el) return; 
    const v = Math.max(0, Math.min(100, pct));
    el.style.width = v + '%';
  }

  function renderTaskRatingProgress(){
    const ratedCount = global.ratedCount || 0;
    const totalTasks = (global.tasks && global.tasks.length) || 0;
    const pct = totalTasks > 0 ? (ratedCount / totalTasks) * 100 : 0;
    setBarWidth(document.getElementById('progressTasksFill'), pct);
  }

  function renderMemberProgress(){
    const completedMembers = global.completedMembers || 0;
    const totalMembers = (global.memberProfiles && global.memberProfiles.length) || 0;
    const pct = totalMembers > 0 ? (completedMembers / totalMembers) * 100 : 0;
    setBarWidth(document.getElementById('progressMembersFill'), pct);
  }

  function renderCurrentRatingProgress(){
    const currentRatingTaskIndex = global.currentRatingTaskIndex || 0;
    const tasks = global.tasks || [];
    const pct = tasks.length > 0 ? ((currentRatingTaskIndex + 1) / tasks.length) * 100 : 0;
    setBarWidth(document.getElementById('progressCurrentRatingFill'), pct);
  }

  function renderAllProgress(){
    renderTaskRatingProgress();
    renderMemberProgress();
    renderCurrentRatingProgress();
  }

  global.renderAllProgress = renderAllProgress;
  global.renderTaskRatingProgress = renderTaskRatingProgress;
  global.renderMemberProgress = renderMemberProgress;
  global.renderCurrentRatingProgress = renderCurrentRatingProgress;
})(window);
