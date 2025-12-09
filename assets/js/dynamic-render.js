// Dynamic render helpers extracted from inline HTML blocks
// Provides functions to build UI fragments previously embedded as template literals.

(function(global){
    'use strict';

    /**
     * Render tally marks visualization for a given value.
     * Original logic extracted from inline template code inside debug-demo.html
     * @param {number} value - positive integer number of marks
     * @returns {string} HTML string
     */
    function renderTallyMarks(value){
        if(!Number.isFinite(value) || value <= 0) return '';
        let remaining = Math.floor(value);
        let result = '';
        while(remaining >= 5){
            result += `<span style="display:inline-block;position:relative;width:22px;height:16px;margin-right:4px;">
                <span style="position:absolute;left:0;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
                <span style="position:absolute;left:4px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
                <span style="position:absolute;left:8px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
                <span style="position:absolute;left:12px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
                <span style="position:absolute;left:16px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>
                <span style="position:absolute;left:0;top:6px;width:20px;height:2px;background:#dc2626;border-radius:1px;transform:rotate(-25deg);transform-origin:center;"></span>
            </span>`;
            remaining -= 5;
        }
        if(remaining > 0){
            const width = remaining * 4;
            result += `<span style="display:inline-block;position:relative;width:${width}px;height:16px;margin-right:4px;">`;
            for(let i=0;i<remaining;i++){
                result += `<span style="position:absolute;left:${i*4}px;top:0;width:2px;height:16px;background:#374151;border-radius:1px;"></span>`;
            }
            result += `</span>`;
        }
        return result;
    }

    // Expose
    global.renderTallyMarks = renderTallyMarks;
})(window);
