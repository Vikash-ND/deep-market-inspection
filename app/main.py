from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import router
from app.user_routes import router as user_router
from app.cache import init_db
from app.auth import init_user_db

app = FastAPI(
    title="Deep Market Inspection API",
    description="Real-time stock analysis and technical indicator engine",
    version="3.0.0"
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
    init_user_db()

app.include_router(router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def root():
    return FileResponse("app/static/index.html")