from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from sqlalchemy.orm import Session
from database import engine, get_db
import models
from core.dispatcher import dispatcher_instance

# Create all database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Project Sisyphus - Master Controller")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)

class ChunkRequest(BaseModel):
    worker_id: str
    worker_type: str # e.g., "browser", "android"

class ChunkResult(BaseModel):
    worker_id: str
    chunk_id: str
    db_id: int
    found_address: str | None = None
    keys_checked: int

class TargetUpdate(BaseModel):
    target_address: str

from auth import get_current_user

@app.get("/")
def read_root():
    return {"status": "Master Controller Online"}

@app.get("/api/target")
def get_target(db: Session = Depends(get_db)):
    target = db.query(models.GlobalTarget).filter(models.GlobalTarget.active == True).first()
    if not target:
        return {"target_address": "0x446e50257e8417fbcd060b9bc2f2f3e8275de184"}
    return {"target_address": target.target_address}

@app.post("/api/target")
def set_target(req: TargetUpdate, db: Session = Depends(get_db)):
    db.query(models.GlobalTarget).update({"active": False})
    new_target = models.GlobalTarget(target_address=req.target_address, active=True)
    db.add(new_target)
    db.commit()
    return {"status": "updated", "target_address": new_target.target_address}

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    leaders = db.query(models.WorkerStats).order_by(models.WorkerStats.total_hashes.desc()).limit(10).all()
    return [{"worker_id": l.worker_id, "total_hashes": l.total_hashes, "chunks_completed": l.chunks_completed} for l in leaders]

@app.post("/api/chunk/request")
def request_chunk(req: ChunkRequest, db: Session = Depends(get_db)):
    chunk = dispatcher_instance.get_next_chunk(db, req.worker_id)
    
    target = db.query(models.GlobalTarget).filter(models.GlobalTarget.active == True).first()
    target_address = target.target_address if target else "0x446e50257e8417fbcd060b9bc2f2f3e8275de184"

    return {
        "chunk_id": chunk["chunk_id"],
        "db_id": chunk["db_id"],
        "start_int": chunk["start_int"],
        "end_int": chunk["end_int"],
        "target_address": target_address
    }

@app.post("/api/chunk/submit")
def submit_result(result: ChunkResult, db: Session = Depends(get_db)):
    print(f"Received result from {result.worker_id}: checked {result.keys_checked} keys.")
    
    # Update DB
    db_chunk = db.query(models.Chunk).filter(models.Chunk.id == result.db_id).first()
    if db_chunk:
        db_chunk.status = "completed"
        db_chunk.keys_checked = result.keys_checked
        if result.found_address:
            db_chunk.found_address = result.found_address
            print(f"!!! MATCH FOUND IN DB CHUNK {result.db_id} !!! -> {result.found_address}")
        
    # Update Worker Stats
    stats = db.query(models.WorkerStats).filter(models.WorkerStats.worker_id == result.worker_id).first()
    if not stats:
        stats = models.WorkerStats(worker_id=result.worker_id, total_hashes=result.keys_checked, chunks_completed=1)
        db.add(stats)
    else:
        stats.total_hashes += result.keys_checked
        stats.chunks_completed += 1

    db.commit()

    return {"status": "accepted"}
