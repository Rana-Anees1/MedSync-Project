# MedSync AI service (planned)

This folder defines the **service boundary** for future machine-learning models. **No model is implemented yet.**
Both prediction endpoints return `501 Not Implemented`, and the Express API falls back to its clearly labelled
rule-based estimate (`model.type = "rule-based"`).

```
React (frontend) → Express API (backend) → Python AI service (this folder) → trained models
                                 ↘ MongoDB
```

## Run (optional)

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate          # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Then set `AI_SERVICE_URL=http://localhost:8000` in `backend/.env`. While the endpoints return 501 the API keeps using
the rule-based estimate, so behaviour does not change.

## Contract

`POST /v1/risk/cancellation` body `{ case, patient, today }` and `POST /v1/risk/complication` body `{ case, patient }`
must return:

```json
{ "probability": 0.42, "level": "medium", "factors": [{ "label": "2 readiness items overdue", "impact": 0.9, "direction": "up" }],
  "model": { "name": "...", "version": "...", "type": "ml" } }
```

The Express API only uses a response whose `model.type` is `"ml"`. Planned training data: a synthetic dataset first, then the
hospital's own outcomes (cancellation reasons, recovery alerts) recorded by MedSync.
