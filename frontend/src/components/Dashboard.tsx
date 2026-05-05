"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type LeaderboardEntry = {
  worker_id: string;
  total_hashes: number;
  chunks_completed: number;
};

export default function Dashboard() {
  const [status, setStatus] = useState("Initializing Wasm Engine...");
  const [keysChecked, setKeysChecked] = useState(0);
  const [activeChunksCount, setActiveChunksCount] = useState(0);
  const [crackedAddress, setCrackedAddress] = useState<string | null>(null);
  const [hashRates, setHashRates] = useState<number[]>([]);
  const [chunksCompleted, setChunksCompleted] = useState(0);
  
  const [username, setUsername] = useState("");
  const [activeUsername, setActiveUsername] = useState("");
  const [globalTarget, setGlobalTarget] = useState("Loading...");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const workersRef = useRef<Worker[]>([]);
  const coreCount = useRef(1);

  const fetchStats = async () => {
    try {
      const targetRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/target`);
      const targetData = await targetRes.json();
      setGlobalTarget(targetData.target_address);

      const boardRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/leaderboard`);
      const boardData = await boardRes.json();
      setLeaderboard(boardData);
    } catch (e) {
      console.error("Error fetching stats", e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    // Initialize core count on mount
    coreCount.current = navigator.hardwareConcurrency || 4;
    setHashRates(new Array(coreCount.current).fill(0));
    return () => clearInterval(interval);
  }, []);

  const requestChunkForWorker = useCallback(async (workerIndex: number) => {
    if (!activeUsername) return;
    
    try {
      const authHeader = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/chunk/request`, { 
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ worker_id: activeUsername, worker_type: "browser_wasm_thread_" + workerIndex })
      });
      const data = await res.json();
      
      workersRef.current[workerIndex]?.postMessage({
        chunkId: data.chunk_id,
        dbId: data.db_id,
        startInt: data.start_int,
        endInt: data.end_int,
        targetAddress: data.target_address
      });
    } catch (err) {
      console.error(`Worker ${workerIndex} failed to fetch chunk:`, err);
    }
  }, [activeUsername]);

  const startMining = useCallback(() => {
    if (!activeUsername) return;
    setStatus(`Spawning ${coreCount.current} Wasm Threads...`);
    setActiveChunksCount(coreCount.current);

    // Initialize array if needed
    if (workersRef.current.length === 0) {
      for (let i = 0; i < coreCount.current; i++) {
        const worker = new Worker(new URL("../workers/miner.worker.ts", import.meta.url));
        
        worker.onmessage = (event) => {
          const { type, keysChecked: currentChecked, chunkId, foundAddress, hashesPerSecond, dbId } = event.data;
          
          if (type === "benchmark") {
            setHashRates(prev => {
              const newRates = [...prev];
              newRates[i] = hashesPerSecond;
              return newRates;
            });
          } else if (type === "complete") {
            setKeysChecked((prev) => prev + (currentChecked || 0));
            setChunksCompleted((prev) => prev + 1);
            
            setHashRates(prev => {
              const newRates = [...prev];
              newRates[i] = hashesPerSecond || 0;
              return newRates;
            });
            
            const authHeader = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` };

            // Submit the result to the FastAPI backend
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/chunk/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader },
                body: JSON.stringify({
                    worker_id: activeUsername,
                    chunk_id: chunkId,
                    db_id: dbId,
                    found_address: foundAddress || null,
                    keys_checked: currentChecked
                })
            }).catch(console.error);

            if (foundAddress) {
              setStatus("🎯 CRACKED! Halting Grid.");
              setActiveChunksCount(0);
              setCrackedAddress(foundAddress);
              workersRef.current.forEach(w => w.terminate());
              workersRef.current = [];
            } else {
              // Request next chunk for this specific worker thread
              setTimeout(() => requestChunkForWorker(i), 10);
            }
          }
        };
        workersRef.current.push(worker);
      }
    }

    // Start all workers
    setStatus(`⛏️ ${coreCount.current} Wasm Engines Crunching...`);
    for (let i = 0; i < coreCount.current; i++) {
      requestChunkForWorker(i);
    }
  }, [activeUsername, requestChunkForWorker]);

  useEffect(() => {
    if (activeUsername) {
      startMining();
    }
  }, [activeUsername, startMining]);

  const handleInitiate = () => {
    if (!username.trim()) return;
    setActiveUsername(username.trim());
  };

  const totalHashRate = hashRates.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-green-500 font-mono p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Dashboard */}
        <div className="md:col-span-2 border border-green-800 rounded-xl p-8 bg-black/50 shadow-2xl shadow-green-900/20">
          <h1 className="text-4xl font-bold mb-4 tracking-wider text-center border-b border-green-800 pb-4">
            PROJECT SISYPHUS
          </h1>
          <p className="text-center text-green-700 text-xs mb-6 uppercase tracking-widest">Multi-Threaded Wasm Grid Miner</p>
          
          <div className="bg-gray-900/50 p-4 rounded-lg border border-red-900/50 mb-6 text-center">
            <h2 className="text-red-700 text-xs uppercase tracking-widest mb-1">Global Target Address</h2>
            <div className="text-lg font-bold text-red-500 break-all">{globalTarget}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-green-900/50">
              <h2 className="text-green-700 text-xs uppercase tracking-widest mb-1">Grid Status</h2>
              <div className="text-sm">{status}</div>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-green-900/50">
              <h2 className="text-green-700 text-xs uppercase tracking-widest mb-1">Active Threads</h2>
              <div className="text-2xl font-bold">{activeChunksCount} <span className="text-sm font-normal text-green-700">/ {coreCount.current} Cores</span></div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-yellow-900/50">
              <h2 className="text-yellow-600 text-xs uppercase tracking-widest mb-1">⚡ Total Hash Rate</h2>
              <div className="text-2xl font-bold text-yellow-400">{totalHashRate.toFixed(0)} <span className="text-sm text-yellow-600">H/s</span></div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-green-900/50">
              <h2 className="text-green-700 text-xs uppercase tracking-widest mb-1">Chunks Completed</h2>
              <div className="text-2xl font-bold">{chunksCompleted}</div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-6 rounded-lg border border-green-900/50 mb-6 text-center">
              <h2 className="text-green-700 text-sm uppercase tracking-widest mb-2">Local Hashes Computed</h2>
              <div className="text-5xl font-bold tracking-tighter tabular-nums">{keysChecked.toLocaleString()}</div>
          </div>

          {crackedAddress && (
            <div className="bg-red-900/50 p-6 rounded-lg border border-red-500 mb-6 text-center animate-pulse">
              <h2 className="text-red-300 text-xl uppercase tracking-widest mb-2 font-bold">!!! TARGET FOUND !!!</h2>
              <div className="text-2xl font-bold tracking-tighter tabular-nums break-all">{crackedAddress}</div>
              <p className="mt-2 text-sm text-red-200">The private key for this address has been recovered by the grid.</p>
            </div>
          )}

          {!activeUsername ? (
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Enter Miner Username..." 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black border border-green-700 rounded-lg p-4 text-center focus:outline-none focus:border-green-400"
              />
              <button 
                onClick={handleInitiate}
                disabled={!username.trim()}
                className="w-full py-4 bg-green-900/20 hover:bg-green-900/40 border border-green-700 rounded-lg uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Initiate Grid Connection
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-4 text-green-600">Mining as: <strong className="text-green-400">{activeUsername}</strong></p>
              <button 
                disabled={true}
                className="w-full py-4 bg-green-900/20 border border-green-700 rounded-lg uppercase tracking-widest opacity-50 cursor-not-allowed"
              >
                {crackedAddress ? "Grid Halted" : activeChunksCount > 0 ? "⛏️ Multi-Thread Mining Active..." : "Connecting..."}
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard Panel */}
        <div className="border border-green-800 rounded-xl p-6 bg-black/50 shadow-2xl shadow-green-900/20 h-fit">
          <h2 className="text-xl font-bold mb-4 tracking-wider text-center border-b border-green-800 pb-4 text-yellow-500">
            🏆 TOP MINERS
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-center text-green-800 text-sm py-4">No data yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {leaderboard.map((miner, index) => (
                <div key={miner.worker_id} className="bg-gray-900/80 p-3 rounded border border-green-900/30 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-yellow-700' : 'text-green-700'}`}>
                      #{index + 1}
                    </span>
                    <span className="text-sm truncate w-24" title={miner.worker_id}>{miner.worker_id}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{miner.total_hashes.toLocaleString()}</div>
                    <div className="text-[10px] text-green-800">{miner.chunks_completed} chunks</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <div className="mt-8 opacity-20 hover:opacity-100 transition-opacity">
        <a href="/admin" className="text-[10px] uppercase tracking-[0.3em] text-green-900 hover:text-green-500">
          [ Command & Control ]
        </a>
      </div>
    </div>
  );
}
