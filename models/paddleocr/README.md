# PaddleOCR-Modell (lokal vendort)

Dieser Ordner soll die PaddleOCR-Modelldateien enthalten, damit Distill Voice
beim Scan-Import nicht mehr von einer externen Quelle abhängt.

Modell-Stufe: **PP-OCRv6 Small** (volles Wörterbuch, robuster bei dichten/
schwierigen Fotos als die Standard-"Tiny"-Stufe).

## Herunterladen (einmalig, ca. 30 MB)

Diese drei Links anklicken – der Browser lädt die Dateien automatisch
herunter. Danach hier in diesen Ordner legen, Dateinamen **unverändert**
lassen:

1. Erkennungs-Modell (Text finden):
   https://media.githubusercontent.com/media/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main/detection/ort/PP-OCRv6_small_det.ort

2. Lese-Modell (Text entziffern):
   https://media.githubusercontent.com/media/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main/recognition/ort/PP-OCRv6_small_rec.ort

3. Zeichen-Wörterbuch:
   https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main/recognition/ppocrv6_dict.txt

Erwartete Dateien danach in diesem Ordner:
- `PP-OCRv6_small_det.ort`
- `PP-OCRv6_small_rec.ort`
- `ppocrv6_dict.txt`

Sobald die drei Dateien hier liegen, verweist scan.js (_getPaddleOcrService())
auf diese lokalen Pfade statt auf die externe GitHub-Quelle.

Quelle/Lizenz: PaddleOCR (Baidu/PaddlePaddle), Apache-2.0. JS-Portierung/
Modell-Hosting: ppu-paddle-ocr-models (PT Perkasa Pilar Utama).
Stand: 08.08.2026.
