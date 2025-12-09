# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - button "Zurück" [ref=e6]: ← Zurück zum Dashboard
      - generic [ref=e7]:
        - heading "📅 Zeitraumanagement" [level=1] [ref=e8]
        - paragraph [ref=e9]: Verwalte die Planungszeiträume für euren WG-Putzplan
    - generic [ref=e10]:
      - button "📋 Zeitraum auswählen" [ref=e11]
      - button "✨ Neuen Zeitraum erstellen" [active] [ref=e12]
      - button "📊 Zeitraum Info" [ref=e13]
    - generic [ref=e15]:
      - generic [ref=e16]:
        - heading "✨ Neuen Zeitraum erstellen" [level=2] [ref=e17]:
          - generic [ref=e18]: ✨
          - text: Neuen Zeitraum erstellen
        - paragraph [ref=e19]: Definiere einen neuen Zeitraum für deinen Putzplan
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e23]: 📅 Startdatum
            - textbox "📅 Startdatum" [ref=e25]: 2025-11-20
          - generic [ref=e26]:
            - generic [ref=e27]: 🏁 Enddatum
            - textbox "🏁 Enddatum" [ref=e29]: 2025-11-27
        - generic [ref=e31]:
          - checkbox "📊 Daten für neuen Zeitraum zurücksetzen Aktiviere diese Option, um alle vorhandenen Daten zu löschen und mit einem sauberen Zeitraum zu beginnen." [ref=e32]
          - generic [ref=e33]:
            - text: 📊 Daten für neuen Zeitraum zurücksetzen
            - paragraph [ref=e34]: Aktiviere diese Option, um alle vorhandenen Daten zu löschen und mit einem sauberen Zeitraum zu beginnen.
        - button "✨ Zeitraum erstellen" [ref=e36] [cursor=pointer]
  - button "🔄 Sync Debug" [ref=e38]
```