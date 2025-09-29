// 🚀 WHATSAPP ULTRA-AUTO-SEND 
// Bypass Browser Security & Auto-Click Send Button
// Universal Cross-Platform Solution

function ultraAutoSend() {
    console.log('🚀 WhatsApp ULTRA Auto-Send gestartet!');
    
    let sendAttempts = 0;
    const maxSendAttempts = 20;
    
    const attemptAutoSend = () => {
        sendAttempts++;
        console.log(`🎯 Ultra Send-Versuch ${sendAttempts}/${maxSendAttempts}`);
        
        // Strategie 1: Direkter Button-Click
        const sendButtonSelectors = [
            // WhatsApp Web 2024 Standard Selektoren
            '[data-icon="send"]',
            'button[aria-label*="Send"]',
            'button[aria-label*="Senden"]',
            'span[data-icon="send"]',
            'button[data-tab="11"]',
            'button[title*="Send"]',
            '[aria-label*="send"]',
            
            // Zusätzliche Selektoren für verschiedene Versionen
            'div[role="button"][aria-label*="Send"]',
            'span[data-testid="send"]',
            'button[data-testid="compose-btn-send"]',
            '.copyable-text[data-tab="10"]'
        ];
        
        let buttonClicked = false;
        
        // Alle Send-Button Selektoren durchgehen
        for (let selector of sendButtonSelectors) {
            try {
                const buttons = document.querySelectorAll(selector);
                
                for (let button of buttons) {
                    // Prüfe ob Button sichtbar ist
                    const rect = button.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0 && 
                                     window.getComputedStyle(button).visibility !== 'hidden';
                    
                    if (isVisible) {
                        console.log(`🎯 Send-Button gefunden mit: ${selector}`);
                        
                        // Multi-Method Click (für maximale Kompatibilität)
                        try {
                            // Method 1: Standard Click
                            button.click();
                            
                            // Method 2: Mouse Event
                            const mouseEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                button: 0
                            });
                            button.dispatchEvent(mouseEvent);
                            
                            // Method 3: Focus + Enter
                            if (button.focus) button.focus();
                            const enterEvent = new KeyboardEvent('keydown', {
                                key: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            });
                            button.dispatchEvent(enterEvent);
                            
                            console.log('✅ BUTTON GEKLICKT - NACHRICHT GESENDET! 🚀');
                            buttonClicked = true;
                            return true;
                            
                        } catch (clickError) {
                            console.log('⚠️ Button-Click Fehler:', clickError);
                        }
                    }
                }
            } catch (selectorError) {
                // Selector nicht gefunden, weiter zum nächsten
                continue;
            }
        }
        
        // Strategie 2: ENTER-Taste in Message Input
        if (!buttonClicked) {
            console.log('🎹 Probiere ENTER-Taste in Message Input...');
            
            const messageInputSelectors = [
                '[contenteditable="true"]',
                'div[data-tab="10"]',
                'div[spellcheck="true"]',
                'div[role="textbox"]',
                'div[data-testid="conversation-compose-box-input"]',
                '.copyable-text'
            ];
            
            for (let selector of messageInputSelectors) {
                try {
                    const inputs = document.querySelectorAll(selector);
                    
                    for (let input of inputs) {
                        const rect = input.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            console.log(`🎯 Message Input gefunden: ${selector}`);
                            
                            // Input fokussieren
                            input.focus();
                            input.click();
                            
                            // ENTER-Event erstellen
                            const enterKeyEvent = new KeyboardEvent('keydown', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            
                            // ENTER senden
                            input.dispatchEvent(enterKeyEvent);
                            
                            // Zusätzlich: KeyUp Event
                            const enterKeyUpEvent = new KeyboardEvent('keyup', {
                                key: 'Enter',
                                code: 'Enter', 
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            });
                            input.dispatchEvent(enterKeyUpEvent);
                            
                            console.log('✅ ENTER GEDRÜCKT - NACHRICHT GESENDET! ⌨️');
                            return true;
                        }
                    }
                } catch (inputError) {
                    continue;
                }
            }
        }
        
        // Strategie 3: Globales ENTER-Event
        if (!buttonClicked) {
            console.log('🌍 Probiere globales ENTER-Event...');
            
            const globalEnterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(globalEnterEvent);
            window.dispatchEvent(globalEnterEvent);
            
            console.log('🌍 Globales ENTER gesendet');
        }
        
        // Wiederholen falls nicht erfolgreich
        if (sendAttempts < maxSendAttempts) {
            console.log(`🔄 Wiederhole in 1.5 Sekunden... (${sendAttempts}/${maxSendAttempts})`);
            setTimeout(attemptAutoSend, 1500);
        } else {
            console.log('🏁 Ultra Auto-Send Versuche beendet');
            
            // Finale Benachrichtigung
            try {
                if (window.alert && typeof window.alert === 'function') {
                    alert('🤖 Auto-Send abgeschlossen!\n\n' +
                          'Falls die Nachricht nicht automatisch gesendet wurde:\n' +
                          '👆 Einfach ENTER drücken oder Send-Button klicken!\n\n' +
                          '📱 Die Nachricht ist bereits eingegeben.');
                }
            } catch (alertError) {
                console.log('ℹ️ Finale Benachrichtigung konnte nicht angezeigt werden');
            }
        }
        
        return false;
    };
    
    // Verzögerter Start für vollständiges WhatsApp Loading
    console.log('⏱️ Warte 6 Sekunden bis WhatsApp vollständig geladen ist...');
    setTimeout(() => {
        console.log('🚀 Ultra Auto-Send startet JETZT!');
        attemptAutoSend();
    }, 6000);
}

// Event Listener für Cross-Origin Messages
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'WHATSAPP_AUTO_SEND') {
        console.log('📨 Ultra Auto-Send Signal via PostMessage empfangen');
        ultraAutoSend();
    }
});

// Auto-Start wenn in WhatsApp Web
if (window.location.href.includes('web.whatsapp.com')) {
    console.log('📱 WhatsApp Web erkannt - Ultra Auto-Send wird vorbereitet');
    
    if (document.readyState === 'complete') {
        ultraAutoSend();
    } else {
        window.addEventListener('load', ultraAutoSend);
        document.addEventListener('DOMContentLoaded', ultraAutoSend);
    }
}

console.log('🚀 WhatsApp Ultra Auto-Send System geladen!');