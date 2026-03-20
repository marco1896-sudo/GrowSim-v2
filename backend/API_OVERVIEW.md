# Grow Simulator Backend API Overview

Base URL (lokal): `http://localhost:8080`

## Health

### GET `/api/health`
Antwort:
```json
{ "ok": true, "service": "growsim-backend" }
```

## Auth

### POST `/api/auth/register`
Body:
```json
{
  "email": "marco@example.com",
  "password": "secret123",
  "displayName": "Marco"
}
```
Antwort:
```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "marco@example.com",
    "displayName": "Marco"
  }
}
```

### POST `/api/auth/login`
Body:
```json
{
  "email": "marco@example.com",
  "password": "secret123"
}
```
Antwort: wie Register

### GET `/api/auth/me`
Header: `Authorization: Bearer <jwt>`

## Save-System

### GET `/api/save`
Optional Query: `?slot=main`

Header: `Authorization: Bearer <jwt>`

Antwort (wenn kein Save vorhanden):
```json
{
  "slot": "main",
  "hasSave": false,
  "state": null,
  "updatedAt": null
}
```

Antwort (wenn Save vorhanden):
```json
{
  "slot": "main",
  "hasSave": true,
  "state": { "...": "kompletter frontend state" },
  "updatedAt": "2026-03-20T...",
  "createdAt": "2026-03-20T..."
}
```

### POST `/api/save`
Header: `Authorization: Bearer <jwt>`

Body:
```json
{
  "slot": "main",
  "state": {
    "simulation": { "simTimeMs": 123456789 },
    "plant": { "phase": "seedling" },
    "status": { "health": 85 }
  }
}
```

Antwort:
```json
{
  "message": "Save stored successfully",
  "slot": "main",
  "updatedAt": "2026-03-20T..."
}
```

---

## Fehlerformat

```json
{
  "error": "Validation failed",
  "details": [
    { "msg": "Valid email is required", "path": "email" }
  ]
}
```
