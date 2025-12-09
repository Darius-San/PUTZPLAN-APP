// Handles min-days slider & dial controls for tasks
(function(global){
  'use strict';

  function toggleMinDays(taskId, enabled){
    const slider = document.getElementById(`minDaysSlider_${taskId}`);
    if(!slider) return; 
    slider.style.display = enabled ? 'block' : 'none';
  }

  function toggleTaskMinDays(taskIndex, enabled){
    const slider = document.getElementById(`taskMinDaysSlider_${taskIndex}`);
    if(slider) slider.style.display = enabled ? 'block' : 'none';
    if(global.tasks && global.tasks[taskIndex]){
      if(!enabled) global.tasks[taskIndex].minDaysBetween = 0;
    }
  }

  function updateMinDays(taskId, value){
    const valueElement = document.getElementById(`minDaysValue_${taskId}`);
    if(valueElement) valueElement.textContent = value;
  }

  function updateTaskMinDays(taskIndex, value){
    const display = document.getElementById(`taskMinDaysValue_${taskIndex}`);
    if(display) display.textContent = value;
    if(global.tasks && global.tasks[taskIndex]){
      global.tasks[taskIndex].minDaysBetween = parseInt(value);
    }
  }

  function updateDialMinDays(taskId, value){
    const progress = document.getElementById(`dialProgress_${taskId}`);
    const text = document.getElementById(`dialText_${taskId}`);
    const label = document.getElementById(`dialLabel_${taskId}`);
    if(!(progress && text && label)) return;
    const percentage = (value - 1) / 29; // normalize 1-30 to 0-1
    const offset = 157 - (157 * percentage);
    progress.style.strokeDashoffset = offset;
    text.textContent = value;
    const dayText = value === '1' ? 'Tag' : 'Tage';
    label.textContent = `${value} ${dayText}`;
    const color = value <= 3 ? '#10b981' : value <= 7 ? '#3b82f6' : '#f59e0b';
    progress.style.stroke = color;
  }

  // Export to global for existing inline handlers
  global.toggleMinDays = toggleMinDays;
  global.toggleTaskMinDays = toggleTaskMinDays;
  global.updateMinDays = updateMinDays;
  global.updateTaskMinDays = updateTaskMinDays;
  global.updateDialMinDays = updateDialMinDays;
})(window);
