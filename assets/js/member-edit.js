// member-edit.js - extracted member edit list rendering
(function(global){
  function createMemberEditItem(index,name='',icon='👤'){
    const defaultMemberIcons = global.defaultMemberIcons || ['👨','👩','🧑','👧','👦'];
    const disableRemove = (global.editMemberCounter || 0) <= 2 ? 'disabled style="opacity: 0.5"' : '';
    const iconOptions = (global.defaultMemberIcons||[]).map(emoji=>`<div class="icon-option" onclick="selectMemberIcon(${index}, '${emoji}')">${emoji}</div>`).join('');
    return `<div class="member-edit-item" data-member-index="${index}">\n`+
      `<div class=\"member-icon-selector\">\n`+
      `<button class=\"member-icon-btn\" onclick=\"toggleIconDropdown(${index})\" data-icon=\"${icon}\">${icon}</button>\n`+
      `<div class=\"icon-dropdown\" id=\"iconDropdown${index}\"><div class=\"icon-grid\">${iconOptions}</div></div>\n`+
      `</div>\n`+
      `<input type=\"text\" class=\"member-name-input\" placeholder=\"Name des Mitglieds\" value=\"${name}\" data-member-name=\"${index}\">\n`+
      `<button class=\"member-remove-btn\" onclick=\"removeMember(${index})\" ${disableRemove}><i class=\"fas fa-trash\"></i></button>\n`+
      `</div>`;
  }
  global.createMemberEditItem = createMemberEditItem;
})(window);
