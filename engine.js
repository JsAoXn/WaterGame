const player = document.getElementById('player');
const floor = document.getElementById('floor');

if (!player) console.error('player element not found');
if (!floor) console.error('floor element not found');

// ----- Input handling -----
const keys = new Set();
document.addEventListener('keydown', (event) => {
    keys.add(event.key);
});
document.addEventListener('keyup', (event) => {
    keys.delete(event.key);
});

// ----- State / physics -----
// Use JS as single source of truth for position/velocity to avoid CSS animation teleport
const state = {
    x: parseInt(player.style.left) || 0,
    y: parseInt(player.style.top) || 0,
    vy: 0,
    speed: 200,    // horizontal px/sec
    jumpSpeed: -600, // initial jump velocity px/sec (negative = up)
    gravity: 2000, // px/sec^2
    jumping: false
};

// Helper: check collision by rect intersection
function checkCollision(div1, div2) {
    const r1 = div1.getBoundingClientRect();
    const r2 = div2.getBoundingClientRect();
    return (
        r1.left < r2.left + r2.width &&
        r1.left + r1.width > r2.left &&
        r1.top < r2.top + r2.height &&
        r1.top + r1.height > r2.top
    );
}

// collectibles state
const collectibles = [];
let spawnAccumulator = 0;
const spawnInterval = 1.5; // seconds between spawns
let score = 0;

// score UI
const scoreEl = document.createElement('div');
scoreEl.style.position = 'fixed';
scoreEl.style.left = '10px';
scoreEl.style.top = '10px';
scoreEl.style.padding = '6px 10px';
scoreEl.style.background = 'rgba(0,0,0,0.5)';
scoreEl.style.color = 'white';
scoreEl.style.fontFamily = 'monospace';
scoreEl.style.zIndex = 9999;
scoreEl.textContent = `Score: ${score}`;
document.body.appendChild(scoreEl);

function spawnWater() {
    const size = 40;
    const newDiv = document.createElement('div');
    newDiv.className = 'collectible';
    newDiv.style.position = 'absolute';
    newDiv.style.width = `${size}px`;
    newDiv.style.height = `${size}px`;
    newDiv.style.backgroundImage = 'url("jerry.png")';
    newDiv.style.backgroundSize = "cover";
    newDiv.style.borderRadius = '4px';

    // compute spawn area: avoid inside floor
    const fRect = floor ? floor.getBoundingClientRect() : { top: window.innerHeight - 100 };
    const maxTop = Math.max(0, fRect.top - size);
    const left = Math.floor(getRandomArbitrary(0, Math.max(0, window.innerWidth - size)));
    const top = Math.floor(getRandomArbitrary(0, maxTop));

    newDiv.style.left = `${left}px`;
    newDiv.style.top = `${top}px`;

    document.body.appendChild(newDiv);
    collectibles.push(newDiv);
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

// If you had CSS animation that moves the element visually, avoid animating top/left —
// JS controls top/left now. Keep 'jumping' class only if it adds non-positional visuals.

// ----- Main loop (requestAnimationFrame) -----
let last = performance.now();

function gameloop(now = performance.now()) {
    if (now % 10 == 0) {
        spawnWater()
    }

    const dt = Math.min((now - last) / 1000, 0.05); // cap dt
    last = now;

    // input-driven horizontal movement (arrow keys / A D)
    if (keys.has('ArrowLeft') || keys.has('a')) state.x -= state.speed * dt;
    if (keys.has('ArrowRight') || keys.has('d')) state.x += state.speed * dt;
    if (keys.has('ArrowUp') || keys.has('w')) {
        // start jump on keydown (only if not already jumping)
        if (!state.jumping) {
            state.vy = state.jumpSpeed;
            state.jumping = true;
            player.classList.add('jumping');
        }
    }

    // physics
    state.vy += state.gravity * dt;
    state.y += state.vy * dt;

    // Apply positions to DOM
    player.style.left = Math.round(state.x) + 'px';
    player.style.top = Math.round(state.y) + 'px';

    // collision & landing: if player's bottom is below floor's top, snap to floor
    const pRect = player.getBoundingClientRect();
    const fRect = floor.getBoundingClientRect();
    if (pRect.bottom > fRect.top) {
        // compute new y so bottom equals floor top
        const newY = state.y - (pRect.bottom - fRect.top);
        state.y = newY;
        state.vy = 0;
        state.jumping = false;
        player.classList.remove('jumping');
        player.style.top = Math.round(state.y) + 'px';
    }

    // spawn logic using accumulator
    spawnAccumulator += dt;
    if (spawnAccumulator >= spawnInterval) {
        spawnAccumulator -= spawnInterval;
        spawnWater();
    }

    // check collectibles collisions
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        if (!document.body.contains(c)) {
            collectibles.splice(i, 1);
            continue;
        }
        if (checkCollision(player, c)) {
            // collected
            c.remove();
            collectibles.splice(i, 1);
            score += 1;
            scoreEl.textContent = `Score: ${score}`;
        }
    }

    requestAnimationFrame(gameloop);
}

// start loop
requestAnimationFrame(gameloop);



