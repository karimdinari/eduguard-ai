"""
main.py — FastAPI application entry point.
Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import upload, chat, submit, answer, lab

app = FastAPI(
    title="TP Learning Supervision System",
    description="AI multi-agent platform for supervised TP evaluation",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(chat.router,   prefix="/api")
app.include_router(submit.router, prefix="/api")
app.include_router(answer.router, prefix="/api")
app.include_router(lab.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}