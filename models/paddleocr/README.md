# PaddleOCR-Modell (lokal vendort)

Enthält die PaddleOCR-Modelldateien, damit Distill Voice beim Scan-Import
nicht von einer externen Quelle abhängt (Modell-Bytes liegen fest im Repo,
nur die Bibliothek selbst kommt per CDN).

Modell-Stufe: **PP-OCRv6 Tiny** (~6 MB).

**Warum Tiny, nicht Small/Medium (Test vom 08.08.2026):** Ein Vergleichstest
mit einem echten Buchfoto (Spalten-/Label-Layout) zeigte, dass die größeren
Stufen bei diesem Dokument SCHLECHTER lesen als Tiny – Small hat z.B.
"Einigkeit" zu "Einigkit" verstümmelt, Medium war noch schlechter (unlesbarer
Seitenanfang, mehrere komplett fehlende Zeilen) und dazu 3x langsamer.
"Größer" ist bei PaddleOCR also nicht automatisch "besser". Diverse
Detection-Einstellungen (Flächen-Schwelle, Auflösung, Padding) wurden
zusätzlich getestet und brachten keine Verbesserung für die eine
hartnäckig unscharfe Zeile auf dem Testfoto – laut Diagnose lag deren
Erkennungssicherheit einfach knapp am Modell-Limit. Für solche Einzelfälle:
Text im Editor nachträglich korrigieren.

Enthaltene Dateien:
- `PP-OCRv6_tiny_det.ort` – Erkennungs-Modell (findet Textblöcke)
- `PP-OCRv6_tiny_rec.ort` – Lese-Modell (entziffert Zeichen)
- `ppocrv6_tiny_dict.txt` – Zeichen-Wörterbuch

Quelle/Lizenz: PaddleOCR (Baidu/PaddlePaddle), Apache-2.0. JS-Portierung/
Modell-Hosting der Originaldateien: ppu-paddle-ocr-models (PT Perkasa Pilar
Utama), https://github.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models.
Stand: 08.08.2026.
