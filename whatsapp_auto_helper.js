// WhatsApp Auto-Send Helper Script
// Dieses Script wird in WhatsApp Web eingefügt um automatisches Senden zu ermöglichen

(function() {
    console.log('🤖 WhatsApp Auto-Send Helper gestartet');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 Sekunden versuchen
    
    function findAndClickSendButton() {
        attempts++;
        
        // Verschiedene Selektoren für den Send-Button probieren
        const selectors = [
            '[data-testid="send"]',
            'button[aria-label*="Send"]', 
            'button[aria-label*="Senden"]',
            'span[data-icon="send"]',
            'button[title*="Send"]',
            'button[title*="Senden"]',
            '[role="button"][aria-label*="Send"]'
        ];
        
        for (let selector of selectors) {
            const sendButton = document.querySelector(selector);
            if (sendButton && sendButton.offsetParent !== null) {
                console.log('✅ Send-Button gefunden:', selector);
                
                // Button klicken
                sendButton.click();
                console.log('🚀 Nachricht automatisch gesendet!');
                
                // Erfolgsmeldung
                setTimeout(() => {
                    alert('✅ WhatsApp-Nachricht wurde automatisch gesendet!');
                }, 1000);
                
                return true;
            }
        }
        
        // Falls Send-Button nicht gefunden, versuche Enter-Taste
        const messageInput = document.querySelector('[data-testid="message-input"]') || 
                           document.querySelector('[contenteditable="true"]');
                           
        if (messageInput && messageInput.textContent.trim()) {
            console.log('🎹 Versuche Enter-Taste...');
            
            // Enter-Event erstellen und auslösen
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            });
            
            messageInput.dispatchEvent(enterEvent);
            console.log('⌨️ Enter-Taste gedrückt');
            
            // Prüfen ob gesendet wurde
            setTimeout(() => {
                if (!messageInput.textContent.trim()) {
                    console.log('✅ Nachricht wurde gesendet (Eingabefeld leer)');
                    alert('✅ WhatsApp-Nachricht wurde automatisch gesendet!');
                    return true;
                }
            }, 1000);
        }
        
        return false;
    }
    
    // Alle 1 Sekunde versuchen
    const autoSendInterval = setInterval(() => {
        console.log(`🔍 Auto-Send Versuch ${attempts}/${maxAttempts}`);
        
        if (findAndClickSendButton()) {
            clearInterval(autoSendInterval);
            console.log('🎉 Auto-Send erfolgreich!');
        } else if (attempts >= maxAttempts) {
            clearInterval(autoSendInterval);
            console.log('⏰ Auto-Send Timeout - bitte manuell senden');
            alert('⏰ Auto-Send nicht möglich - bitte manuell ENTER drücken oder SENDEN klicken');
        }
    }, 1000);
    
    // Message Listener für externe Befehle
    window.addEventListener('message', function(event) {
        if (event.data.type === 'WHATSAPP_AUTO_SEND' && event.data.action === 'CLICK_SEND') {
            console.log('📨 Externes Auto-Send-Signal empfangen');
            findAndClickSendButton();
        }
    });
    
    console.log('👂 Auto-Send Helper bereit - wartet auf Send-Button...');
})();