"""
MedSync AI service (PLANNED) — FastAPI service boundary for future trained models.

STATUS: no model is trained or deployed yet. Every prediction endpoint answers
HTTP 501 Not Implemented, so the Express API (backend/src/services/ai/riskProvider.js)
keeps using its transparent rule-based estimate. Nothing here produces predictions.

When a model exists, return the response shape below with model.type == "ml";
the Express API will then use it automatically (set AI_SERVICE_URL in backend/.env).
"""
from typing import Any, List, Literal, Optional
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="MedSync AI service", version="0.0.0-planned")


class Factor(BaseModel):
    label: str
    impact: float
    direction: Literal["up", "down"]


class ModelInfo(BaseModel):
    name: str
    version: str
    type: Literal["ml"]


class RiskResponse(BaseModel):
    """Contract expected by the Express API."""
    probability: float
    level: Literal["low", "medium", "high"]
    tier: Optional[Literal["low", "medium", "high"]] = None
    factors: List[Factor]
    model: ModelInfo


class CancellationRequest(BaseModel):
    case: dict[str, Any]
    patient: Optional[dict[str, Any]] = None
    today: str


class ComplicationRequest(BaseModel):
    case: dict[str, Any]
    patient: Optional[dict[str, Any]] = None


NOT_IMPLEMENTED = {"detail": "No trained model is deployed yet. The MedSync API uses its rule-based estimate."}


@app.get("/health")
def health():
    return {"status": "ok", "models": [], "implemented": False}


@app.post("/v1/risk/cancellation", response_model=RiskResponse, responses={501: {"description": "Model not implemented"}})
def cancellation_risk(_req: CancellationRequest):
    return JSONResponse(status_code=501, content=NOT_IMPLEMENTED)


@app.post("/v1/risk/complication", response_model=RiskResponse, responses={501: {"description": "Model not implemented"}})
def complication_risk(_req: ComplicationRequest):
    return JSONResponse(status_code=501, content=NOT_IMPLEMENTED)
