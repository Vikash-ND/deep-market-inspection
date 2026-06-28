from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routers import router
from app.user_routes import router as user_router
from app.cache import init_db
from app.auth import init_user_db
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Deep Market Inspection API",
    description="Real-time stock analysis and technical indicator engine",
    version="3.0.0"
)

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: StarletteHTTPException):
    if request.url.path.startswith("/api/"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    return FileResponse("app/static/404.html", status_code=404)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "version": "3.0.0",
        "database": "connected"
    }

@app.get("/analysis/{ticker}")
def analysis_page(ticker: str):
    return FileResponse("app/static/analysis.html")

@app.get("/")
def root():
    return FileResponse("app/static/index.html")

@app.get("/compare")
def compare_page():
    return FileResponse("app/static/compare.html")

@app.get("/static/service-worker.js")
def sw():
    return FileResponse("app/static/service-worker.js")

@app.get("/portfolio")
def portfolio_page():
    return FileResponse("app/static/portfolio.html")

@app.get("/robots.txt")
def robots():
    return FileResponse("app/static/robots.txt")

@app.get("/sitemap.xml")
def sitemap():
    return FileResponse("app/static/sitemap.xml")

@app.get("/portfolio")
def portfolio_page():
    return FileResponse("app/static/portfolio.html")