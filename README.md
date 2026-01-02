# VNSS TMS Scaffold

## Quick start
```bash
cd ops && docker compose up --build
# API: http://localhost:8000/health
# Web: http://localhost:3000/dispatch
```

## Create a sample trip
```bash
curl -X POST http://localhost:8000/api/v1/trips -H "Content-Type: application/json" -d '{"id":"T001","status":"ASSIGNED"}'
```
