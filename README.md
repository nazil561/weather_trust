# 🌍 WeatherTrust: The Verifiable Trust Layer for Climate Data

**IEEE ClimateChain Global Hackathon 2026 Submission**
**Track:** Climate Data & Environmental Monitoring

> *"Don't just share climate data. Prove how far to trust it."*

## 📌 The Problem
Climate decisions—from carbon markets to early warning systems—depend on satellite data. However, these readings can be corrupted by sensor drift, cloud contamination, and cyberattacks. Currently, users have no way to verify if the data they are using is authentic. If a malicious actor alters a temperature reading by even 1 degree, it can silently corrupt a multi-million dollar carbon credit or a climate model. 

## 🚀 The Solution
**WeatherTrust** is a 3D, cinematic intelligence platform that acts as a verifiable trust layer. We don't just display data; we mathematically and cryptographically prove it is real.

1. **AI Cross-Verification:** We fetch live ground truth from the Open-Meteo API and compare it against simulated satellite readings. If the delta (error) is too large due to a cloud edge or sensor drift, the AI calculates a low Trust Score (0-1) and flags the data.
2. **Trust Gate Filtering:** Users can instantly filter out low-trust anomalies using a real-time slider on our 12K WebGL Earth.
3. **Cryptographic Anchoring:** Every observation batch is hashed into a Merkle Tree. Users can simulate a cyberattack to watch the Merkle proof instantly break, proving data integrity on-chain.
4. **Zero-Knowledge Privacy:** We use Circom ZK-SNARKs to prove data compliance without revealing proprietary satellite coordinates.

## ✨ Key Features (Try these in the Live Demo!)
*   **12K Cinematic Earth:** Built with Three.js (PBR rendering, real SGP4 orbital mechanics, 1,500+ instanced debris objects).
*   **Global Target Acquisition:** Type any of 40+ global locations (India, Tokyo, London, etc.) to instantly re-scatter the AI data points and fetch the real local weather.
*   **Multi-Domain Verification:** Toggle between Land Surface Temp (LST), Sea Surface Temp (SST), and Atmospheric Ozone (O3).
*   **AI Explainability:** Click any red anomaly dot to see the Ground Truth Delta, a Radar Chart of failure metrics, and the raw SHA-256 hash.
*   **Thermal & God's Eye View:** Cinematic camera modes to visualize the data grid like a military HUD.
*   **Tamper Demo:** Click the red "TAMPER" button to watch the Merkle hash mismatch in the terminal log.

## 🛠️ Technology Stack
*   **Frontend:** Vanilla JS, **Three.js** (WebGL), Chart.js, HTML5/CSS3.
*   **Data APIs:** Open-Meteo (Live Ground Truth), KeepTrack API (Real satellite TLEs).
*   **Backend (Repo Only):** **FastAPI** (Python), Scikit-Learn (Isolation Forest ML model).
*   **Web3/Crypto (Repo Only):** **Circom** (Groth16 ZK-SNARKs), **Solidity**, OpenZeppelin MerkleProof.

## 💻 How to Run Locally

The live GitHub Pages demo is 100% self-contained in the `/docs` folder (using frontend math for 60fps performance). To run it locally:

```bash
# 1. Clone the repo
git clone https://github.com/nazil561/weather_trust.git
cd weather_trust/docs

# 2. Start a local server
python3 -m http.server 5500
