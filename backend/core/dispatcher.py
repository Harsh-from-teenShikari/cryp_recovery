from sqlalchemy.orm import Session
from models import Chunk

class Dispatcher:
    def __init__(self):
        self.chunk_size = 500000 # Increased for multi-core WebAssembly miners

    def get_next_chunk(self, db: Session, worker_id: str):
        """Returns the next available chunk for processing, saving it to DB."""
        # Find the highest end_int currently assigned
        # Since we stored as strings, we might need a separate int tracker or 
        # for SQLite string max works if zero-padded, but let's just query the last row.
        last_chunk = db.query(Chunk).order_by(Chunk.id.desc()).first()
        
        if last_chunk:
            start = int(last_chunk.end_int) + 1
        else:
            start = 1000000000 # Initial start
            
        end = start + self.chunk_size - 1
        
        new_chunk = Chunk(
            start_int=str(start),
            end_int=str(end),
            status="pending",
            worker_id=worker_id
        )
        db.add(new_chunk)
        db.commit()
        db.refresh(new_chunk)
        
        return {
            "chunk_id": f"chunk_{new_chunk.id}",
            "db_id": new_chunk.id,
            "start_int": new_chunk.start_int,
            "end_int": new_chunk.end_int
        }

dispatcher_instance = Dispatcher()
