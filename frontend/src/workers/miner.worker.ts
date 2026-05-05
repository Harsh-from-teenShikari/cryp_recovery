// Wasm-powered Miner Web Worker
// Uses Rust-compiled secp256k1 + Keccak-256 for near-native speed

import init, { mine_chunk, benchmark } from 'sisyphus-wasm-miner';

let wasmReady = false;

// Initialize Wasm module on worker startup
async function initWasm() {
  await init();
  wasmReady = true;

  // Run a quick benchmark
  const hps = benchmark(1000);
  console.log(`[Wasm Worker] ⚡ Benchmark: ${hps.toFixed(0)} H/s (1000 sample)`);
  self.postMessage({ type: "benchmark", hashesPerSecond: hps });
}

initWasm().catch(console.error);

self.addEventListener("message", async (event: MessageEvent) => {
  const { chunkId, dbId, startInt, endInt, targetAddress } = event.data;

  if (!wasmReady) {
    console.warn("[Wasm Worker] Wasm not ready yet, waiting...");
    await initWasm();
  }

  console.log(`[Wasm Worker] ⛏️  Mining chunk ${chunkId} from ${startInt} to ${endInt}`);
  const startTime = performance.now();

  // Delegate entire chunk to the Rust Wasm binary
  const resultStr = mine_chunk(String(startInt), String(endInt), targetAddress) as string;
  const result = JSON.parse(resultStr);

  const elapsed = (performance.now() - startTime) / 1000;
  const hps = result.keysChecked / elapsed;

  console.log(`[Wasm Worker] ✅ Chunk ${chunkId} done: ${result.keysChecked} keys in ${elapsed.toFixed(2)}s (${hps.toFixed(0)} H/s)`);

  if (result.found) {
    console.log(`[Wasm Worker] 🎯 CRACKED! Address: ${result.address} | Private Key: ${result.privateKey}`);
  }

  self.postMessage({
    type: "complete",
    chunkId,
    dbId,
    keysChecked: result.keysChecked,
    foundAddress: result.found ? result.address : null,
    hashesPerSecond: hps,
    status: "complete"
  });
});
