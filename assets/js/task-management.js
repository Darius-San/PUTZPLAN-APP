// Task Management rendering & dynamic task creation extracted from debug-demo.html
(function(global){
  function ensureTaskId(){
    if(!global.__taskIdCounter) global.__taskIdCounter = 0;
    return `task_${++global.__taskIdCounter}`;
  }

  function addTask(){
    const taskList = document.getElementById('taskList');
    const taskId = ensureTaskId();
    const newTask = document.createElement('div');
    newTask.className = 'task-item';
    newTask.innerHTML = `
      <div class="form-group">
        <label>Task Name</label>
        <input type="text" placeholder="z.B. Wäsche waschen" />
      </div>
      <div class="form-group">
        <label>Beschreibung</label>
        <input type="text" placeholder="Wäsche sortieren, waschen, aufhängen..." />
      </div>
      <div class="form-group">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <input type="checkbox" id="minDaysEnabled_${taskId}" onchange="toggleMinDays('${taskId}', this.checked)">
          <label for="minDaysEnabled_${taskId}" style="margin:0;">⏳ Mindestabstand zwischen Ausführungen</label>
        </div>
        <div id="minDaysSlider_${taskId}" style="margin-left:24px;display:none;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span>Mindestens </span>
            <input type="range" class="min-days-range" min="1" max="30" value="3" style="width:150px;" oninput="updateMinDays('${taskId}', this.value)">
            <span id="minDaysValue_${taskId}">3</span>
            <span> Tage Pause</span>
          </div>
        </div>
      </div>`;
    taskList.appendChild(newTask);
  }

  function buildTaskManagementList(){
    const container = document.getElementById('taskManagementList');
    if(!container) return;
    container.innerHTML = '';
    (global.tasks||[]).forEach((task, index)=>{
      const card = document.createElement('div');
      card.className = 'card mb-4';
      const checked = task.minDaysBetween > 0 ? 'checked' : '';
      const sliderDisplay = task.minDaysBetween > 0 ? '' : 'display: none;';
      const checklist = (task.checklist||[]).map((item,itemIndex)=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <input type="text" value="${item}" class="checklist-item" style="flex:1;border:1px solid #ddd;padding:6px;border-radius:4px;">
          <button onclick="removeChecklistItem(${index}, ${itemIndex})" class="btn btn-secondary" style="padding:6px 10px;font-size:12px;">×</button>
        </div>`).join('');
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="font-size:24px;">${task.emoji}</div>
          <div style="flex:1;">
            <input type="text" value="${task.title}" class="task-edit-name" style="font-weight:bold;border:1px solid #ddd;padding:8px;border-radius:6px;width:100%;">
          </div>
        </div>
        <div class="form-group mb-3">
          <label>Beschreibung:</label>
          <input type="text" value="${task.description}" class="task-edit-description" style="border:1px solid #ddd;padding:8px;border-radius:6px;width:100%;">
        </div>
        <div class="form-group mb-3">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <input type="checkbox" id="taskMinDays_${index}" ${checked} onchange="toggleTaskMinDays(${index}, this.checked)">
            <label for="taskMinDays_${index}">⏳ Mindestabstand zwischen Ausführungen</label>
          </div>
          <div id="taskMinDaysSlider_${index}" style="margin-left:24px;${sliderDisplay}">
            <div style="display:flex;align-items:center;gap:8px;">
              <span>Mindestens </span>
              <input type="range" min="1" max="30" value="${task.minDaysBetween || 1}" style="width:150px;" oninput="updateTaskMinDays(${index}, this.value)">
              <span id="taskMinDaysValue_${index}">${task.minDaysBetween || 1}</span>
              <span> Tage Pause</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>📋 Checkliste für diesen Task:</label>
          <div id="checklistItems_${index}" class="mt-2">${checklist}</div>
          <button onclick="addChecklistItem(${index})" class="btn btn-secondary mt-2" style="font-size:14px;">+ Punkt hinzufügen</button>
        </div>`;
      container.appendChild(card);
    });
  }

  global.addTask = addTask;
  global.buildTaskManagementList = buildTaskManagementList;
})(window);
