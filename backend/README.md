# Grow Simulator Backend

Ein **einfaches, produktionsnahes Backend** für dein bestehendes Grow-Simulator-Frontend.

## Warum diese Architektur?

- **Node + Express**: leicht zu verstehen, große Community
- **MongoDB**: sehr gut für flexiblen Game-State als JSON (ohne starres SQL-Schema)
- **JWT Auth**: Standard für mobile/web Frontend-Auth
- **Eine klare Save-API**: dein bestehender `state` kann fast 1:1 gespeichert werden

## Was dieses Backend kann

- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Save-System:
  - `GET /api/save`
  - `POST /api/save`
- Health:
  - `GET /api/health`
- CORS über ENV konfigurierbar
- Docker/Coolify-ready

---

## Projektstruktur

```txt
backend/
  src/
    config/
      db.js
      env.js
    controllers/
      authController.js
      saveController.js
    middleware/
      auth.js
      errorHandler.js
      validateRequest.js
    models/
      Save.js
      User.js
    routes/
      authRoutes.js
      healthRoutes.js
      saveRoutes.js
    utils/
      httpError.js
    app.js
    server.js
  .dockerignore
  .env.example
  API_OVERVIEW.md
  docker-compose.local.yml
  Dockerfile
  package.json
```

---

## Lokales Setup

### 1) Abhängigkeiten installieren
```bash
cd backend
npm install
```

### 2) ENV anlegen
```bash
cp .env.example .env
```
Dann `.env` ausfüllen:
- `JWT_SECRET` (lange zufällige Zeichenkette)
- `MONGODB_URI`
- `CORS_ORIGINS`

### 3) Starten
```bash
npm start
```
oder im Dev-Modus:
```bash
npm run dev
```

Backend läuft dann auf `http://localhost:8080`.

---

## Optional lokal mit Docker + Mongo

```bash
docker compose -f docker-compose.local.yml up --build
```

---

## Frontend-Integration (minimaler Umbau)

Dein Frontend speichert aktuell lokal (z. B. `localStorage`).
Für Backend-Sync brauchst du nur zusätzlich:

1. User registrieren/loggen -> JWT speichern (z. B. localStorage)
2. Beim Laden:
   - `GET /api/save`
   - Wenn `hasSave === true`, `state` in die bestehende Runtime übernehmen
3. Beim Speichern:
   - aktuellen kompletten State an `POST /api/save` senden

### Beispiel Fetch (Save)
```js
await fetch('https://BACKEND_URL/api/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    slot: 'main',
    state: currentState
  })
});
```

### Beispiel Fetch (Load)
```js
const res = await fetch('https://BACKEND_URL/api/save', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await res.json();
if (data.hasSave && data.state) {
  // in bestehende GrowSim-Logik mergen/restoren
}
```

---

## Coolify Deployment (einfach)

1. Repository in Coolify verbinden
2. Service auf Ordner `backend/` zeigen
3. Buildpack/Dockerfile nutzen (Dockerfile ist vorhanden)
4. ENV Variablen in Coolify setzen:
   - `NODE_ENV=production`
   - `PORT=8080`
   - `JWT_SECRET=...`
   - `JWT_EXPIRES_IN=7d`
   - `MONGODB_URI=...`
   - `CORS_ORIGINS=https://deine-frontend-domain.tld`
5. Port 8080 exponieren (oder Coolify-intern routen)
6. Deploy auslösen

### MongoDB in Coolify
Du kannst in Coolify zusätzlich einen MongoDB-Service erstellen und dessen Connection String als `MONGODB_URI` verwenden.

---

## Hinweis zu Skills/Tools (OpenClaw)

Ich habe aktiv nach passenden Skills gesucht (Backend/Express/MongoDB/Docker). Relevant gefunden wurden u. a.:
- `codewithhashim/...@express-backend-starter`
- `laskar-ksatria/...@nodejs-express-mongodb-backend-pattern`

Für dein Ziel war ein direktes, sauberes In-Repo-Backend ohne zusätzliche Skill-Installation am sinnvollsten (weniger Komplexität, volle Kontrolle).

---

Details zu Endpoints und Request/Response: siehe **API_OVERVIEW.md**.
