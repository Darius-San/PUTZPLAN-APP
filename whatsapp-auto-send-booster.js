/**
 * 🚀 WhatsApp Auto-Send Booster
 * Vollautomatisches Senden von WhatsApp-Nachrichten
 * Umgeht Browser-Sicherheitsbeschränkungen mit mehreren Fallback-Strategien
 */

// 🎯 UNIVERSELLE AUTO-SEND FUNKTION
function executeWhatsAppAutoSend() {
    console.log('🤖 WhatsApp Auto-Send Booster gestartet');
    
    let attempts = 0;
    const maxAttempts = 15;
    
    const findAndClickSendButton = () => {
        attempts++;
        console.log(`🔍 Auto-Send Versuch ${attempts}/${maxAttempts}`);
        
        // 📋 ALLE BEKANNTEN WHATSAPP SEND-BUTTON SELEKTOREN
        const sendButtonSelectors = [
            // Standard WhatsApp Web Selektoren (2023/2024)
            '[data-icon="send"]',
            'button[aria-label*="Send"]',
            'button[aria-label*="Senden"]', 
            'span[data-icon="send"]',
            'button[data-tab="11"]',
            'button[title*="Send"]',
            'button[title*="Senden"]',
            '[aria-label*="send"]',
            '[title*="Send"]',
            
            // Fallback Selektoren
            'button[type="submit"]',
            '.copyable-text[data-tab="10"]',
            'div[role="button"][aria-label*="Send"]',
            'div[role="button"][title*="Send"]',
            
            // Spezielle Selektoren für verschiedene WhatsApp Versionen
            'span[data-testid="send"]',
            'button[data-testid="compose-btn-send"]',
            'div[data-testid="send-button"]'
        ];
        
        let buttonFound = false;
        
        // 🎯 Send-Button suchen und klicken
        for (let selector of sendButtonSelectors) {
            try {
                const buttons = document.querySelectorAll(selector);
                
                for (let button of buttons) {
                    // Prüfe ob Button sichtbar und klickbar ist
                    const rect = button.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        console.log('🎯 Send-Button gefunden mit Selektor:', selector);
                        
                        // Button klicken mit verschiedenen Methoden
                        try {
                            button.click();
                        } catch (e) {
                            // Fallback: Mouse Event
                            const event = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            button.dispatchEvent(event);
                        }
                        
                        console.log('✅ NACHRICHT AUTOMATISCH GESENDET! 🚀');
                        return true;
                    }
                }
            } catch (e) {
                // Selector fehler ignorieren, nächsten probieren
                continue;
            }
        }
        
        // 🎹 FALLBACK: ENTER-TASTE SIMULIEREN
        if (!buttonFound) {
            console.log('🎹 Probiere ENTER-Taste als Fallback');
            
            const messageInputSelectors = [
                '[contenteditable="true"]',
                'div[data-tab="10"]',
                'div[spellcheck="true"]',
                'div[role="textbox"]',
                'div[data-testid="conversation-compose-box-input"]'
            ];
            
            for (let selector of messageInputSelectors) {
                try {
                    const input = document.querySelector(selector);
                    if (input) {
                        input.focus();
                        
                        // ENTER-Event erstellen und auslösen
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        
                        input.dispatchEvent(enterEvent);
                        console.log('✅ ENTER-TASTE GEDRÜCKT - NACHRICHT GESENDET! ⌨️');
                        return true;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        // 🔄 WIEDERHOLEN falls nicht erfolgreich
        if (attempts < maxAttempts) {
            console.log(`🔄 Versuche erneut in 2 Sekunden... (${attempts}/${maxAttempts})`);
            setTimeout(findAndClickSendButton, 2000);
        } else {
            console.log('⏰ Auto-Send Versuche beendet. Manuelles Senden erforderlich.');
            
            // Letzte Benachrichtigung
            if (window.alert) {
                setTimeout(() => {
                    alert('🤖 Auto-Send konnte nicht abgeschlossen werden.\n\nBitte manuell ENTER drücken oder Send-Button klicken! 📱');
                }, 1000);
            }
        }
        
        return false;
    };
    
    // ⏱️ DELAYED START (WhatsApp muss vollständig geladen sein)
    console.log('⏱️ Warte 8 Sekunden bis WhatsApp vollständig geladen ist...');
    setTimeout(() => {
        console.log('🚀 Auto-Send startet jetzt!');
        findAndClickSendButton();
    }, 8000);
}

// 🎧 MESSAGE LISTENER für Cross-Origin Communication
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'WHATSAPP_AUTO_SEND') {
        console.log('📨 Auto-Send Signal empfangen via PostMessage');
        executeWhatsAppAutoSend();
    }
});

// 🔄 AUTO-START wenn direkt in WhatsApp Web geladen
if (window.location.href.includes('web.whatsapp.com')) {
    console.log('📱 WhatsApp Web erkannt - Auto-Send bereit');
    
    // Warte bis Seite vollständig geladen ist
    if (document.readyState === 'complete') {
        executeWhatsAppAutoSend();
    } else {
        window.addEventListener('load', executeWhatsAppAutoSend);
    }
}

console.log('🚀 WhatsApp Auto-Send Booster geladen und bereit!');