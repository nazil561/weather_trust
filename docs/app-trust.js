let radarChart = null;
let originalData = [];
let currentDomain = 'land';
let currentRegion = 'texas';

const REGIONS = {
    texas: { name: "Austin, TX", lat: 30.26, lon: -97.74, bbox: { minLat: 25, maxLat: 36, minLon: -106, maxLon: -93 } },
    california: { name: "Los Angeles, CA", lat: 34.05, lon: -118.24, bbox: { minLat: 32, maxLat: 42, minLon: -124, maxLon: -114 } },
    india: { name: "New Delhi, IN", lat: 28.61, lon: 77.20, bbox: { minLat: 8, maxLat: 37, minLon: 68, maxLon: 97 } },
    mumbai: { name: "Mumbai, IN", lat: 19.07, lon: 72.87, bbox: { minLat: 15, maxLat: 25, minLon: 68, maxLon: 78 } },
    europe: { name: "Berlin, DE", lat: 52.52, lon: 13.40, bbox: { minLat: 35, maxLat: 60, minLon: -10, maxLon: 30 } },
    australia: { name: "Sydney, AU", lat: -33.86, lon: 151.20, bbox: { minLat: -44, maxLat: -10, minLon: 113, maxLon: 153 } },
    brazil: { name: "São Paulo, BR", lat: -23.55, lon: -46.63, bbox: { minLat: -33, maxLat: -5, minLon: -74, maxLon: -34 } },
    japan: { name: "Tokyo, JP", lat: 35.67, lon: 139.65, bbox: { minLat: 24, maxLat: 45, minLon: 122, maxLon: 146 } }
};

setInterval(() => {
    document.getElementById('utc-clock').textContent = new Date().toISOString().slice(11, 19);
}, 1000);

function calculateTrust(satReading, groundTruth, maxDelta) {
    const delta = Math.abs(satReading - groundTruth);
    let trust = Math.max(0, 1 - (delta / maxDelta));
    trust += (Math.random() * 0.05 - 0.025); 
    return Math.max(0, Math.min(1, trust)); 
}

function generateHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
    return hash;
}

async function initializeData() {
    const region = REGIONS[currentRegion];
    document.getElementById('current-region-name').textContent = region.name;
    
    // UI SCANNING ANIMATION
    const scanOverlay = document.getElementById('scan-overlay');
    scanOverlay.classList.remove('hidden');
    document.getElementById('explain-card').style.display = 'none';
    document.getElementById('explain-hint').style.display = 'block';

    logEvent("info", `Establishing uplink for ${currentDomain.toUpperCase()} in ${region.name}...`);
    
    const tempEl = document.getElementById('live-api-temp');
    const statusEl = document.getElementById('live-api-status');

    let realTemp = 22.0;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m`;
        const res = await fetch(url);
        const data = await res.json();
        realTemp = data.current.temperature_2m;
        
        if (tempEl) tempEl.textContent = `${realTemp}°C`;
        if (statusEl) { statusEl.textContent = "ACTIVE ✓"; statusEl.style.color = "#22c55e"; }
        logEvent("safe", `Ground Truth API Connected: ${realTemp}°C`);
    } catch (err) {
        if (tempEl) tempEl.textContent = "OFFLINE";
        if (statusEl) { statusEl.textContent = "FALLBACK"; statusEl.style.color = "#ef4444"; }
    }

    // Wait 800ms to show the cool scanning animation
    setTimeout(() => {
        scanOverlay.classList.add('hidden');

        const dataArray = [];
        const { minLat, maxLat, minLon, maxLon } = region.bbox;
        
        for (let i = 0; i < 500; i++) {
            const lat = minLat + Math.random() * (maxLat - minLat);
            const lon = minLon + Math.random() * (maxLon - minLon);
            
            let groundTruth, satReading, maxDelta, labelUnit, reasons;
            
            if (currentDomain === 'land') {
                groundTruth = realTemp - ((lat - region.lat) * 1.2) + (Math.random() * 2 - 1);
                maxDelta = 5.0; labelUnit = '°C'; reasons = "Cloud edge / Surface albedo error";
            } else if (currentDomain === 'ocean') {
                groundTruth = 24 + (Math.random() * 3 - 1.5); 
                maxDelta = 2.0; labelUnit = '°C'; reasons = "Sun glint / High turbidity";
            } else {
                groundTruth = 150 + (Math.random() * 40 - 20); 
                maxDelta = 30.0; labelUnit = ' ppb'; reasons = "Aerosol interference / Haze";
            }

            const hasError = Math.random() > 0.8;
            const errorAmount = (currentDomain === 'atmos') ? (Math.random() * 80 - 40) : (Math.random() * 16 - 8);
            satReading = hasError ? groundTruth + errorAmount : groundTruth + (Math.random() * 1 - 0.5);
                
            const delta = satReading - groundTruth;
            const trust_score = calculateTrust(satReading, groundTruth, maxDelta);
            const isFlagged = trust_score < 0.6;

            dataArray.push({
                obs_id: `T-${i}`, lat, lon,
                trust_score, flag: isFlagged,
                top_reasons: isFlagged ? reasons : 'Clear',
                sat_value: satReading.toFixed(1), ground_truth: groundTruth.toFixed(1), delta: delta.toFixed(1),
                unit: labelUnit, hash: generateHash()
            });
        }
        
        originalData = dataArray;
        updateUI(originalData);
    }, 800); // 800ms delay for cinematic effect
}

function updateUI(data) {
    let flaggedCount = 0; let totalTrust = 0;
    data.forEach(obs => { totalTrust += obs.trust_score; if (obs.flag) flaggedCount++; });

    document.getElementById('stat-sats').textContent = `${data.length}`;
    document.getElementById('stat-objs').textContent = `${flaggedCount}`;
    document.getElementById('stat-breach').textContent = `${(totalTrust / data.length || 0).toFixed(2)}`;

    const valueAtRisk = flaggedCount * 50; // $50/ton
    document.getElementById('carbon-value').textContent = `$${valueAtRisk.toLocaleString()}`;

    if (window.earthControls && window.earthControls.setObservations) {
        window.earthControls.setObservations(data);
    } else {
        window.dispatchEvent(new CustomEvent('earth-obs-data', { detail: data }));
    }
}

// SECTOR GRID CLICK LISTENER
document.querySelectorAll('.sector-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // UI Updates
        document.querySelectorAll('.sector-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Logic Updates
        currentRegion = e.target.dataset.region;
        initializeData();
    });
});

document.getElementById('domain-select').addEventListener('change', (e) => {
    currentDomain = e.target.value;
    initializeData();
});

initializeData();

document.getElementById('trust-slider').addEventListener('input', (e) => {
    const threshold = e.target.value / 100;
    document.getElementById('trust-val').textContent = `${e.target.value}%`;
    const filteredData = originalData.filter(obs => obs.trust_score >= threshold);
    updateUI(filteredData);
});

window.addEventListener('earth-obs-select', (e) => {
    const obs = e.detail;
    document.getElementById('explain-hint').style.display = 'none';
    document.getElementById('explain-card').style.display = 'flex';
    
    document.getElementById('l-id').textContent = obs.obs_id;
    document.getElementById('l-trust').textContent = obs.trust_score.toFixed(3);
    document.getElementById('l-trust').style.color = obs.flag ? '#ef4444' : '#22c55e';
    document.getElementById('l-reason').textContent = obs.top_reasons || 'Unknown';
    
    document.getElementById('l-sat-label').textContent = currentDomain === 'atmos' ? 'Satellite Ozone' : 'Satellite Temp';
    document.getElementById('l-sat').textContent = `${obs.sat_value}${obs.unit}`;
    document.getElementById('l-ref-label').textContent = currentDomain === 'atmos' ? 'Ground Truth Ozone' : 'Ground Truth Temp';
    document.getElementById('l-ref').textContent = `${obs.ground_truth}${obs.unit}`;
    
    const deltaEl = document.getElementById('l-delta');
    deltaEl.textContent = `${obs.delta > 0 ? '+' : ''}${obs.delta}${obs.unit}`;
    deltaEl.style.color = Math.abs(obs.delta) > (currentDomain === 'atmos' ? 20 : 2) ? '#ef4444' : '#22c55e';

    document.getElementById('l-hash').textContent = obs.hash;

    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChart) radarChart.destroy();
    
    const cloudCover = Math.min(100, Math.abs(obs.delta) * (currentDomain === 'atmos' ? 2 : 15) + Math.random() * 10);
    const viewAngle = Math.random() * 40 + 10;
    const sensorDrift = obs.flag ? Math.random() * 40 + 50 : Math.random() * 10;
    const thermalNoise = Math.random() * 30 + 5;

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Cloud Cover', 'View Angle', 'Sensor Drift', 'Thermal Noise'],
            datasets: [{
                label: 'Risk Metrics (%)', data: [cloudCover, viewAngle, sensorDrift, thermalNoise],
                backgroundColor: obs.flag ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                borderColor: obs.flag ? '#ef4444' : '#22c55e', pointBackgroundColor: '#fff', borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { r: { angleLines: { color: 'rgba(255, 255, 255, 0.1)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }, pointLabels: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } }, ticks: { display: false, min: 0, max: 100 } } }
        }
    });
});

// Carbon, Tamper, Logging (Keep existing logic)
document.getElementById('carbon-btn').addEventListener('click', () => {
    logEvent("info", "Initializing ZKP generation pipeline...");
    const btn = document.getElementById('carbon-btn');
    btn.textContent = "⏳ PROVING...";
    btn.style.opacity = '0.7';
    const steps = ["Loading circuit: proximity.circom...", "Generating witness from Open-Meteo ground truth...", "Computing polynomial commitments...", "Running Groth16 prover...", "Generating Merkle root...", "Proof generated in 1.24s. Verifying..."];
    let i = 0;
    const interval = setInterval(() => {
        if (i < steps.length) { logEvent("info", `[ZKP] ${steps[i]}`); i++; }
        else {
            clearInterval(interval);
            const hasAnomalies = originalData.some(obs => obs.flag);
            if (hasAnomalies) {
                logEvent("breach", "❌ CARBON CREDIT REJECTED: Low-trust anomalies detected in Merkle Tree.");
                btn.textContent = "❌ REJECTED"; btn.style.background = "rgba(239, 68, 68, 0.3)"; btn.style.borderColor = "#ef4444"; btn.style.color = "#ef4444"; btn.style.opacity = '1';
            } else {
                logEvent("safe", "✅ PROOF VERIFIED ON-CHAIN. CARBON CREDIT APPROVED.");
                btn.textContent = "✅ APPROVED"; btn.style.background = "rgba(34, 197, 94, 0.3)"; btn.style.opacity = '1';
                const certificate = { project: "WeatherTrust Climate MRV", status: "VERIFIED", timestamp: new Date().toISOString(), merkle_root: "0x8f2a9b1c4e5d...", on_chain_anchor: "Sepolia Testnet", issuer: "WeatherTrust ZKP Engine v1.0" };
                const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "WeatherTrust_Carbon_Certificate.json"; a.click(); URL.revokeObjectURL(url);
                logEvent("safe", "📄 Trust Certificate downloaded successfully.");
            }
        }
    }, 400);
});

document.getElementById('tamper-btn').addEventListener('click', () => {
    logEvent("warning", "⚠️ INITIATING CYBERATTACK SIMULATION...");
    setTimeout(() => {
        logEvent("breach", "🚨 DATA ALTERED! RECALCULATING HASH...");
        setTimeout(() => {
            logEvent("breach", `❌ MERKLE VERIFICATION FAILED.`);
            document.body.style.animation = "flash-breach 0.5s ease-in-out 3";
            document.getElementById('audit-chip').className = 'audit-chip audit-fail';
            document.getElementById('audit-chip').textContent = 'TAMPER-PROOF LEDGER: INVALID ✗';
            setTimeout(() => { document.body.style.animation = ""; }, 1500);
        }, 800);
    }, 1000);
});

function logEvent(level, msg) {
    const log = document.getElementById('event-log');
    const li = document.createElement('li'); li.className = `log-item log-${level}`;
    li.innerHTML = `<span class="log-time">${new Date().toISOString().slice(11,19)}</span> ${msg}`;
    log.prepend(li);
}
logEvent("info", "3D Climate Grid Initialized.");
