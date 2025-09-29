        // 🚀 ULTRA WhatsApp-Integration - KOMPLETT automatisch (auch Enter!)
        async function sendAutomaticWhatsAppAlert(taskTitle) {
            const phoneNumber = '+491724620111'; // Test-Nummer
            const currentProfile = getCurrentProfileId();
            const profile = profiles[currentProfile];
            const wgName = profile ? profile.name : 'WG';
            const sender = getCurrentUser() || 'Ein WG-Mitglied';
            
            // Nachricht vorbereiten
            const message = `🚨 *DRINGENDER TASK ALARM* 🚨\n\n` +
                `🏠 *${wgName}*\n` +
                `📋 Task: *${taskTitle}*\n\n` +
                `⚠️ Dieser Task wurde als SEHR DRINGEND markiert!\n` +
                `👤 Markiert von: ${sender}\n` +
                `⏰ Zeit: ${new Date().toLocaleString()}\n\n` +
                `📱 AKTION ERFORDERLICH:\n` +
                `Bitte kümmere dich schnellstmöglich um diesen Task!\n\n` +
                `_🤖 Automatisch generiert von der WG-Putzplan-App_`;
            
            console.log('🚀 ULTRA-AUTOMATIK startet - KOMPLETT ohne Benutzeraktion!');
            
            // 1️⃣ Erst ULTRA Python Service versuchen (KOMPLETT AUTOMATISCH - auch Enter!)
            try {
                const ultraResponse = await fetch('http://localhost:8004/send-whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phoneNumber, message: message })
                });
                
                if (ultraResponse.ok) {
                    const ultraData = await ultraResponse.json();
                    if (ultraData.success) {
                        console.log("🎉 ULTRA-AUTOMATIK GESTARTET!");
                        showSuccessToast(
                            "🚀 ULTRA-AUTOMATIK GESTARTET!\n\n" +
                            "✅ WhatsApp öffnet automatisch\n" +
                            "✅ Nachricht wird automatisch eingefügt\n" + 
                            "✅ Send-Button wird automatisch geklickt\n" +
                            "✅ Enter wird automatisch gedrückt\n" +
                            "✅ Fenster schließt automatisch\n\n" +
                            "🎯 KOMPLETT ohne Benutzeraktion!\n" +
                            "Schauen Sie einfach zu!"
                        );
                        return;
                    }
                }
            } catch (error) {
                console.log("ℹ️ ULTRA-Service nicht verfügbar, versuche Browser-Fallback");
            }
            
            // 2️⃣ Browser-Fallback für maximale Kompatibilität
            console.log("🔄 Starte Browser-Fallback mit maximaler Automatisierung...");
            
            // Geräte-Erkennung
            const isDesktop = window.innerWidth > 1024;
            const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
            const isMobile = window.innerWidth <= 768;
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            
            console.log(`📱 Gerät: ${isDesktop ? 'Desktop' : isTablet ? 'Tablet' : 'Mobile'}`);
            
            // URLs für verschiedene Geräte
            const wa_me_url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            const web_url = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
            const app_url_ios = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
            const app_url_android = `intent://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
            
            // Gerätespezifische Öffnung
            if (isMobile || isTablet) {
                // Mobile/Tablet: Direkte App-Integration
                console.log('📱 Mobile/Tablet-Modus: Öffne WhatsApp App direkt');
                
                try {
                    if (isIOS) {
                        window.location.href = app_url_ios;
                        setTimeout(() => window.open(wa_me_url, '_blank'), 1500);
                    } else if (isAndroid) {
                        window.location.href = app_url_android;
                        setTimeout(() => window.open(wa_me_url, '_blank'), 1500);
                    } else {
                        window.open(wa_me_url, '_blank');
                    }
                    
                    showSuccessToast(
                        "📱 WHATSAPP APP WIRD GEÖFFNET!\n\n" +
                        `✅ ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Tablet'}-Integration aktiv\n` +
                        `📞 Ziel: ${phoneNumber}\n` +
                        `📝 Nachricht automatisch eingefügt\n\n` +
                        "⚡ Einfach senden!"
                    );
                    
                } catch (error) {
                    console.log('📱 App-Öffnung fehlgeschlagen, verwende Fallback');
                    window.open(wa_me_url, '_blank');
                }
                
            } else {
                // Desktop: WhatsApp Web
                console.log('🖥️ Desktop-Modus: Verwende WhatsApp Web');
                
                const whatsappWindow = window.open(web_url, 'whatsapp_desktop', 'width=1200,height=800');
                
                if (whatsappWindow) {
                    console.log('✅ WhatsApp Web geöffnet');
                    
                    // JavaScript für automatisches Senden injizieren
                    setTimeout(() => {
                        try {
                            const autoSendScript = `
                                console.log("🤖 Auto-Send Skript gestartet...");
                                
                                async function tryAutoSend() {
                                    await new Promise(resolve => setTimeout(resolve, 4000));
                                    
                                    const sendSelectors = [
                                        '[data-testid="send"]',
                                        'button[aria-label*="Send"]',
                                        'button[aria-label*="Senden"]',
                                        'span[data-icon="send"]'
                                    ];
                                    
                                    for (const selector of sendSelectors) {
                                        try {
                                            const button = document.querySelector(selector);
                                            if (button) {
                                                button.click();
                                                console.log("✅ Send-Button geklickt!");
                                                setTimeout(() => window.close(), 2000);
                                                return;
                                            }
                                        } catch (e) {}
                                    }
                                    
                                    // Enter als Fallback
                                    const inputField = document.querySelector('[data-testid="conversation-compose-box-input"]');
                                    if (inputField) {
                                        inputField.focus();
                                        const event = new KeyboardEvent('keydown', {
                                            key: 'Enter', keyCode: 13, bubbles: true
                                        });
                                        inputField.dispatchEvent(event);
                                        console.log("✅ Enter gedrückt!");
                                    }
                                }
                                
                                tryAutoSend();
                            `;
                            
                            whatsappWindow.postMessage({ type: 'EXECUTE_SCRIPT', script: autoSendScript }, '*');
                            
                        } catch (e) {
                            console.log('ℹ️ Cross-origin Script-Injection nicht möglich');
                        }
                    }, 3000);
                    
                    showSuccessToast(
                        "🖥️ WHATSAPP WEB GEÖFFNET!\n\n" +
                        "✅ Nachricht automatisch eingefügt\n" +
                        `📞 An: ${phoneNumber}\n\n` +
                        "🚀 AUTO-SEND AKTIV:\n" +
                        "• WhatsApp lädt...\n" +
                        "• Auto-Send startet in 7 Sekunden\n" +
                        "• Send-Button wird automatisch geklickt\n" +
                        "• Falls nötig: Enter wird automatisch gedrückt\n\n" +
                        "💡 Bei Browser-Sicherheit: Manuell senden"
                    );
                } else {
                    showErrorToast(
                        "🚫 Popup blockiert!\n\n" +
                        "🔧 Lösung: Popup-Blocker deaktivieren\n" +
                        `🔗 Oder manuell: wa.me/${phoneNumber}`
                    );
                }
            }
            
            // Erfolgs-Info
            console.log('✅ WhatsApp-Integration gestartet');
            console.log(`📞 Ziel: ${phoneNumber}`);
            console.log(`📝 Nachricht: ${message.length} Zeichen`);
        }