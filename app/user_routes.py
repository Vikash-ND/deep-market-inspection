from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime
import sqlite3
from app.auth import (
    create_user, get_user_by_email, verify_password,
    create_access_token, get_current_user, DB_PATH
)

router = APIRouter(prefix="/auth")

# ── Schemas ────────────────────────────────────────
class SignupBody(BaseModel):
    username: str
    email: str
    password: str

class LoginBody(BaseModel):
    email: str
    password: str

class WatchlistBody(BaseModel):
    ticker: str
    name: str = ""

class NoteBody(BaseModel):
    ticker: str
    note: str

class HistoryBody(BaseModel):
    ticker: str
    period: str
    summary: str

# ── Auth routes ────────────────────────────────────
@router.post("/signup")
def signup(body: SignupBody):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    ok = create_user(body.username, body.email, body.password)
    if not ok:
        raise HTTPException(status_code=400, detail="Email or username already exists")
    user = get_user_by_email(body.email)
    token = create_access_token({"sub": str(user[0])})
    return {"token": token, "username": user[1], "email": user[2]}

@router.post("/login")
def login(body: LoginBody):
    user = get_user_by_email(body.email)
    if not user or not verify_password(body.password, user[3]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user[0])})
    return {"token": token, "username": user[1], "email": user[2]}

@router.get("/me")
def me(current=Depends(get_current_user)):
    return current

# ── Watchlist routes ───────────────────────────────
@router.get("/watchlist")
def get_watchlist(current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT ticker, name, added FROM watchlist WHERE user_id=? ORDER BY added DESC",
        (current["id"],)
    ).fetchall()
    conn.close()
    return [{"ticker": r[0], "name": r[1], "added": r[2]} for r in rows]

@router.post("/watchlist")
def add_watchlist(body: WatchlistBody, current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "INSERT OR IGNORE INTO watchlist (user_id, ticker, name, added) VALUES (?,?,?,?)",
            (current["id"], body.ticker.upper(), body.name, datetime.utcnow().isoformat())
        )
        conn.commit()
        return {"message": f"{body.ticker.upper()} added to watchlist"}
    finally:
        conn.close()

@router.delete("/watchlist/{ticker}")
def remove_watchlist(ticker: str, current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "DELETE FROM watchlist WHERE user_id=? AND ticker=?",
        (current["id"], ticker.upper())
    )
    conn.commit()
    conn.close()
    return {"message": f"{ticker.upper()} removed from watchlist"}

# ── History routes ─────────────────────────────────
@router.get("/history")
def get_history(current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT ticker, period, summary, viewed FROM analysis_history WHERE user_id=? ORDER BY viewed DESC LIMIT 20",
        (current["id"],)
    ).fetchall()
    conn.close()
    return [{"ticker": r[0], "period": r[1], "summary": r[2], "viewed": r[3]} for r in rows]

@router.post("/history")
def add_history(body: HistoryBody, current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO analysis_history (user_id, ticker, period, summary, viewed) VALUES (?,?,?,?,?)",
        (current["id"], body.ticker.upper(), body.period, body.summary, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    return {"message": "History saved"}

# ── Notes routes ───────────────────────────────────
@router.get("/notes")
def get_notes(current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT ticker, note, updated FROM notes WHERE user_id=? ORDER BY updated DESC",
        (current["id"],)
    ).fetchall()
    conn.close()
    return [{"ticker": r[0], "note": r[1], "updated": r[2]} for r in rows]

@router.post("/notes")
def save_note(body: NoteBody, current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO notes (user_id, ticker, note, updated) VALUES (?,?,?,?)",
        (current["id"], body.ticker.upper(), body.note, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    return {"message": "Note saved"}

@router.delete("/notes/{ticker}")
def delete_note(ticker: str, current=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "DELETE FROM notes WHERE user_id=? AND ticker=?",
        (current["id"], ticker.upper())
    )
    conn.commit()
    conn.close()
    return {"message": "Note deleted"}
