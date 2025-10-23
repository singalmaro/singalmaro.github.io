// 행성별 중력값 및 색상
const PLANETS = {
    earth:   { name: '지구',    g: 9.8,   color: '#1976d2' },
    moon:    { name: '달',      g: 1.62,  color: '#888888' },
    mars:    { name: '화성',    g: 3.71,  color: '#e57373' },
    jupiter: { name: '목성',    g: 24.79, color: '#ffb300' },
    mercury: { name: '수성',    g: 3.7,   color: '#90a4ae' },
    venus:   { name: '금성',    g: 8.87,  color: '#ba68c8' },
    saturn:  { name: '토성',    g: 10.44, color: '#ffd54f' },
};

const heightInput = document.getElementById('heightInput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const simArea = document.getElementById('simArea');
const planetChecks = document.querySelectorAll('.planetCheck');

let posChart, velChart;

function createCharts() {
    const posCtx = document.getElementById('posChart').getContext('2d');
    const velCtx = document.getElementById('velChart').getContext('2d');
    posChart = new Chart(posCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            animation: false,
            scales: {x: {title: {display: true, text: '시간(s)'}}, y: {title: {display: true, text: '위치(m)'}}}
        }
    });
    velChart = new Chart(velCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            animation: false,
            scales: {x: {title: {display: true, text: '시간(s)'}}, y: {title: {display: true, text: '속도(m/s)'}}}
        }
    });
}

// 시뮬레이션 상태
let planetStates = {}; // {planetKey: {height, g, time, velocity, position, running, lastTimestamp, dataPoints, ...}}
let running = false;

function getSelectedPlanets() {
    return Array.from(planetChecks).filter(chk => chk.checked).map(chk => chk.value);
}

function createPlanetCanvas(planetKey) {
    const planet = PLANETS[planetKey];
    const div = document.createElement('div');
    div.className = 'planet-canvas';
    div.id = `canvas-${planetKey}`;
    // 캔버스
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 240;
    canvas.id = `fallCanvas-${planetKey}`;
    // 데이터
    const dataDiv = document.createElement('div');
    dataDiv.className = 'planet-data';
    dataDiv.innerHTML = `
        <b>${planet.name}</b><br>
        시간: <span id="timeDisplay-${planetKey}">0.00</span> s<br>
        위치: <span id="posDisplay-${planetKey}">0.00</span> m<br>
        속도: <span id="velDisplay-${planetKey}">0.00</span> m/s
    `;
    div.appendChild(canvas);
    div.appendChild(dataDiv);
    simArea.appendChild(div);
}

function clearPlanetCanvases() {
    simArea.innerHTML = '';
}

function resetSim() {
    running = false;
    planetStates = {};
    clearPlanetCanvases();
    const height = parseFloat(heightInput.value);
    const selected = getSelectedPlanets();
    selected.forEach(planetKey => {
        const g = PLANETS[planetKey].g;
        planetStates[planetKey] = {
            height,
            g,
            time: 0,
            velocity: 0,
            position: height,
            lastTimestamp: null,
            dataPoints: [{t: 0, pos: height, vel: 0}],
            finished: false
        };
        createPlanetCanvas(planetKey);
        drawBall(planetKey);
        updateDisplays(planetKey);
    });
    updateCharts();
}

function updateDisplays(planetKey) {
    const state = planetStates[planetKey];
    document.getElementById(`timeDisplay-${planetKey}`).textContent = state.time.toFixed(2);
    document.getElementById(`posDisplay-${planetKey}`).textContent = Math.max(0, state.position).toFixed(2);
    document.getElementById(`velDisplay-${planetKey}`).textContent = state.velocity.toFixed(2);
}

function drawBall(planetKey) {
    const state = planetStates[planetKey];
    const canvas = document.getElementById(`fallCanvas-${planetKey}`);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const canvasHeight = canvas.height;
    const ballRadius = 12;
    const y = canvasHeight - (state.position / state.height) * (canvasHeight - ballRadius*2) - ballRadius;
    ctx.beginPath();
    ctx.arc(canvas.width/2, y, ballRadius, 0, 2 * Math.PI);
    ctx.fillStyle = PLANETS[planetKey].color;
    ctx.fill();
    ctx.stroke();
}

function updateCharts() {
    // 시간축: 모든 행성의 최대 시간까지
    let maxLen = 0;
    let allTimes = [];
    Object.values(planetStates).forEach(state => {
        if (state.dataPoints.length > maxLen) maxLen = state.dataPoints.length;
        allTimes = allTimes.concat(state.dataPoints.map(d => d.t));
    });
    // x축 라벨: 0 ~ 최대 시간까지 0.05초 간격
    const maxTime = Math.max(...allTimes, 2);
    const labels = [];
    for (let t = 0; t <= maxTime + 0.01; t += 0.05) labels.push(t.toFixed(2));
    // 데이터셋 생성
    posChart.data.labels = labels;
    posChart.data.datasets = [];
    velChart.data.labels = labels;
    velChart.data.datasets = [];
    Object.entries(planetStates).forEach(([planetKey, state]) => {
        // 보간: 각 시간에 맞는 위치/속도
        const posArr = [], velArr = [];
        let idx = 0;
        for (let i = 0; i < labels.length; i++) {
            const t = parseFloat(labels[i]);
            while (idx+1 < state.dataPoints.length && state.dataPoints[idx+1].t <= t) idx++;
            // 선형 보간
            let pos = 0, vel = 0;
            if (idx+1 < state.dataPoints.length) {
                const d0 = state.dataPoints[idx], d1 = state.dataPoints[idx+1];
                const ratio = (t - d0.t) / (d1.t - d0.t);
                pos = d0.pos + (d1.pos - d0.pos) * ratio;
                vel = d0.vel + (d1.vel - d0.vel) * ratio;
            } else {
                const d0 = state.dataPoints[idx];
                pos = d0.pos;
                vel = d0.vel;
            }
            posArr.push(pos);
            velArr.push(vel);
        }
        posChart.data.datasets.push({
            label: PLANETS[planetKey].name,
            data: posArr,
            borderColor: PLANETS[planetKey].color,
            fill: false,
            tension: 0.1
        });
        velChart.data.datasets.push({
            label: PLANETS[planetKey].name,
            data: velArr,
            borderColor: PLANETS[planetKey].color,
            fill: false,
            tension: 0.1
        });
    });
    posChart.update();
    velChart.update();
}

function stepSim(dt) {
    let anyRunning = false;
    Object.entries(planetStates).forEach(([planetKey, state]) => {
        if (state.finished) return;
        state.time += dt;
        state.velocity = state.g * state.time;
        state.position = state.height - 0.5 * state.g * state.time * state.time;
        if (state.position <= 0) {
            state.position = 0;
            state.finished = true;
        } else {
            anyRunning = true;
        }
        state.dataPoints.push({t: state.time, pos: Math.max(0, state.position), vel: state.velocity});
        updateDisplays(planetKey);
        drawBall(planetKey);
    });
    updateCharts();
    return anyRunning;
}

function animate(timestamp) {
    if (!running) return;
    let minLast = null;
    Object.values(planetStates).forEach(state => {
        if (state.lastTimestamp !== null) {
            if (minLast === null || state.lastTimestamp < minLast) minLast = state.lastTimestamp;
        }
    });
    if (minLast === null) minLast = timestamp;
    const dt = (timestamp - minLast) / 1000;
    Object.values(planetStates).forEach(state => {
        state.lastTimestamp = timestamp;
    });
    const anyRunning = stepSim(dt);
    if (anyRunning) {
        requestAnimationFrame(animate);
    } else {
        running = false;
    }
}

startBtn.onclick = function() {
    if (!running) {
        running = true;
        Object.values(planetStates).forEach(state => {
            state.lastTimestamp = null;
        });
        requestAnimationFrame(animate);
    }
};
pauseBtn.onclick = function() {
    running = false;
};
resetBtn.onclick = function() {
    resetSim();
};
heightInput.onchange = function() {
    resetSim();
};
planetChecks.forEach(chk => {
    chk.onchange = function() {
        resetSim();
    };
});

window.onload = function() {
    createCharts();
    resetSim();
}; 