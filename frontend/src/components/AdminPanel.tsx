"use client";

import { useState } from "react";

export default function AdminPanel() {
  const [newTarget, setNewTarget] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateTarget = async () => {
    if (!newTarget.startsWith("0x") || newTarget.length !== 42) {
      setStatus("❌ Invalid Ethereum Address format.");
      return;
    }

    setIsLoading(true);
    setStatus("Updating Global Grid...");

    try {
      const authHeader = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/target`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ target_address: newTarget }),
      });

      if (res.ok) {
        setStatus("✅ SUCCESS! Every worker in the world is now targeting your new address.");
        setNewTarget("");
      } else {
        const err = await res.json();
        setStatus(`❌ Error: ${err.detail || "Failed to update"}`);
      }
    } catch (e) {
      setStatus("❌ Connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-green-500 font-mono p-8">
      <div className="max-w-2xl w-full border border-green-800 rounded-xl p-8 bg-black/50 shadow-2xl shadow-green-900/20">
        <h1 className="text-3xl font-bold mb-6 tracking-wider text-center border-b border-green-800 pb-4">
          COMMAND & CONTROL
        </h1>
        
        <p className="text-center text-green-700 text-xs mb-8 uppercase tracking-widest">
          Update the global grid target address
        </p>

        <div className="flex flex-col gap-6">
          <div>
            <label className="text-xs uppercase text-green-800 mb-2 block">New Target Address</label>
            <input 
              type="text" 
              placeholder="0x..." 
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-full bg-black border border-green-700 rounded-lg p-4 text-center text-green-400 focus:outline-none focus:border-green-400 transition-all"
            />
          </div>

          <button 
            onClick={handleUpdateTarget}
            disabled={isLoading || !newTarget}
            className="w-full py-4 bg-green-900/20 hover:bg-green-900/40 border border-green-700 rounded-lg uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Broadcasting..." : "Re-Target Global Grid"}
          </button>

          {status && (
            <div className={`p-4 rounded border text-center text-sm ${status.includes('✅') ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>
              {status}
            </div>
          )}

          <div className="mt-8 text-center">
            <a href="/" className="text-xs text-green-800 hover:text-green-500 underline uppercase tracking-widest">
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
