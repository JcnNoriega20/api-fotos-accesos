# API – Fotos accesos ESP32

Esta API recibe una imagen en Base64 desde una ESP32-CAM y la sube a un repositorio de GitHub.

### Endpoint
POST https://<tu-dominio>.vercel.app/api/upload

### Body
```json
{
  "id": "12345",
  "base64": "<cadena base64>"
}
