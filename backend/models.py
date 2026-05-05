from sqlalchemy import Column, Integer, String, Boolean, BigInteger
from database import Base

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    start_int = Column(String, index=True) # Storing as string to handle BigInt ranges if we exceed SQL limits
    end_int = Column(String)
    status = Column(String, default="pending") # "pending", "completed"
    worker_id = Column(String, nullable=True)
    keys_checked = Column(Integer, default=0)
    found_address = Column(String, nullable=True)

class GlobalTarget(Base):
    __tablename__ = "global_target"

    id = Column(Integer, primary_key=True, index=True)
    target_address = Column(String, default="0x446e50257e8417fbcd060b9bc2f2f3e8275de184")
    active = Column(Boolean, default=True)

class WorkerStats(Base):
    __tablename__ = "worker_stats"

    worker_id = Column(String, primary_key=True, index=True)
    total_hashes = Column(BigInteger, default=0)
    chunks_completed = Column(Integer, default=0)
