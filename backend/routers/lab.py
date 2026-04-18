"""
routers/lab.py — POST /api/lab/bootstrap
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import orchestrator

router = APIRouter()


class LabBootstrapRequest(BaseModel):
    tp_data: dict


@router.post("/lab/bootstrap")
def bootstrap_lab(req: LabBootstrapRequest):
    """
    Register a structured lab (title + parts + questions) as a new backend session.
    Used for demo/sample labs or when the client already has tp_data without a PDF upload.
    """
    if not req.tp_data.get("parts"):
        raise HTTPException(status_code=400, detail="tp_data.parts is required")
    try:
        return orchestrator.handle_lab_bootstrap(req.tp_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
