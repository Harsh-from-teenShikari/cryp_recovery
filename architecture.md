# PROJECT SISYPHUS

## THEORETICAL ARCHITECTURE: CONSUMER-GRADE DISTRIBUTED COMPUTE GRID

**Abstract:** This document revises the theoretical framework for attempting the computational recovery of cryptocurrency sent to a "dead" destination address. Bypassing quantum computing requirements, this model maps out a purely classical, brute-force grid attack. It relies entirely on decentralizing the computational load across millions of consumer-grade devices—smartphones, personal laptops, and gaming GPUs—forming a massive, parallelized supercomputer.

### 1. Theoretical Attack Vectors (Classical Approach)
Without the shortcuts of quantum algorithms, the system cannot work backwards from a hash. Instead, it must execute a massive, forward-calculating brute-force attack across the secp256k1 curve.

#### 1.1 High-Speed Forward Generation
The core mechanic requires generating a Private Key, multiplying it across the elliptic curve to find the Public Key, hashing it via Keccak-256, and comparing the resulting Address to the target destination. The theoretical viability relies entirely on pushing the "Hashes per Second" (H/s) to extreme limits by distributing the task to millions of everyday devices.

#### 1.2 Probability Band Targeting
Rather than randomly guessing across the entire 2^{256} integer space, the system algorithmically targets specific "probability bands." This includes generating keys based on historically flawed random number generators, common dictionary seed phrases, and narrow entropy bands where developers often make logic errors during custom wallet creation.

### 2. System Architecture: The "Everyday" Compute Grid
To achieve maximum parallelization using normal, consumer hardware, the architecture relies on edge networks and zero-friction browser mining.

#### 2.1 Master Controller (FastAPI)
The core routing intelligence is built on a lightweight FastAPI microservice. This server acts as the dispatcher. It takes targeted bands of the integer space (e.g., from integer X to integer Y) and packages them into small, manageable computational "chunks" that can be solved by a standard smartphone or laptop CPU in under 5 minutes.

#### 2.2 WebAssembly Browser Miners (Next.js)
The visualization layer is a Next.js application that serves a dual purpose. Following a strict Zero-Backend philosophy for user interaction, the frontend interface serves as the Command Center. However, it also utilizes WebAssembly (Wasm) and Web Workers. The moment a user visits the site to view the abstract, symbolic representation of the global effort, their browser automatically begins crunching a chunk of the math, contributing to the pool frictionlessly.

#### 2.4 Automated Load Balancing (n8n)
To manage the intake of millions of telemetry pings from phones and browsers, n8n workflows dynamically orchestrate the backend capacity. As the consumer grid scales up, n8n automatically spins up additional lightweight load-balancers to ensure the FastAPI dispatcher is not overwhelmed by the sheer volume of completed computational chunks.

### 3. Deployment Infrastructure & Constraints
The system is designed to be highly distributed and completely resilient to central point failures.

*   **Frontend & Wasm Distribution:** Deployed via Vercel for immediate, globally distributed edge delivery of the Next.js application.
*   **Command API Hosting:** Deployed on Fly.io or Railway for fast, low-latency container management.

**Critical Infrastructure Constraint:** Under absolutely no circumstances will any component of this application be deployed on the Render platform. All automated n8n provisioning explicitly blacklists Render from its deployment targets.
