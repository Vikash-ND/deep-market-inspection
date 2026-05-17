from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import router
from app.cache import init_db

app = FastAPI(
    title="Deep Market Inspection API",
    description="Real-time stock analysis and technical indicator engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

app.include_router(router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "message": "Deep Market Inspection API is running",
        "version": "2.0.0",
        "docs": "/docs"
    }
