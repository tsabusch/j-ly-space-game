/* Betűfutam – Phaser 3 + target-lock + snap
   Controls:
   - J: J-lézer
   - L: LY-plazma
   - ← / → : target váltás (opcionális, “arcade” feel)
   - Space: ismétlés (utolsó fegyver)
*/

const WORDS = [
  { full: "golyó", correct: "ly" },
  { full: "folyó", correct: "ly" },
  { full: "hely", correct: "ly" },
  { full: "lyuk", correct: "ly" },
  { full: "pálya", correct: "ly" },
  { full: "játék", correct: "j" },
  { full: "jég", correct: "j" },
  { full: "jó", correct: "j" },
  { full: "hajó", correct: "j" },
  { full: "juh", correct: "j" },
];

// --- helpers
function makeMasked(full) {
  // Nem írunk ki hibás betűt: a j/ly helyére csak egy “slot” jel kerül.
  // Egyszerű: első előforduló 'ly' vagy 'j' slotolása.
  if (full.includes("ly")) return full.replace("ly", "⟦⚡⟧");
  // 'j' eset: az első j betűt slotoljuk
  const idx = full.indexOf("j");
  if (idx >= 0) return full.slice(0, idx) + "⟦⚡⟧" + full.slice(idx + 1);
  return full;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
    this.player = null;
    this.obstacles = [];
    this.bullets = [];
    this.score = 0;
    this.lives = 3;

    this.spawnTimer = 0;
    this.spawnInterval = 900; // ms (később dinamikus)

    this.baseSpeed = 120; // px/s, “előrehaladás” érzés
    this.lastWeapon = "j";

    this.lockedTarget = null;
    this.lockMode = "auto"; // auto snap; manual with arrows also supported

    this.ui = {};
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background gradient + starfield
    this.add.rectangle(W/2, H/2, W, H, 0x0b1030).setAlpha(1);
    const stars = this.add.particles(0, 0, "__WHITE", {
      x: { min: 0, max: W },
      y: { min: 0, max: H },
      quantity: 2,
      frequency: 40,
      lifespan: 4000,
      speedY: { min: 25, max: 60 },
      speedX: { min: -8, max: 8 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.18, end: 0 },
      blendMode: "ADD",
    });
    // Phaser internal texture for particles
    // Create a 2x2 white texture once
    if (!this.textures.exists("__WHITE")) {
      const g = this.make.graphics({ x:0, y:0, add:false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0,0,2,2);
      g.generateTexture("__WHITE", 2, 2);
      g.destroy();
    }

    // Player (simple ship)
    this.player = this.add.container(W/2, H*0.68);
    const shipGlow = this.add.circle(0, 0, 28, 0x6fb8ff, 0.12);
    const shipBody = this.add.triangle(0, 2, 0, -18, -14, 18, 14, 18, 0xcfe9ff, 0.95);
    const flame = this.add.ellipse(0, 26, 10, 18, 0xffc35c, 0.9);
    this.player.add([shipGlow, shipBody, flame]);

    // UI
    this.ui.score = this.add.text(18, 14, `Pont: ${this.score}`, { fontFamily: "system-ui, -apple-system, Segoe UI", fontSize: "18px", color:"#cfe9ff" });
    this.ui.lives = this.add.text(18, 40, `Élet: ${"♥".repeat(this.lives)}`, { fontFamily: "system-ui, -apple-system, Segoe UI", fontSize: "18px", color:"#cfe9ff" });
    this.ui.help = this.add.text(18, H-30, `Lőj: J (J) vagy L (LY) | Space: ismétlés | ←/→: cél váltás`, { fontFamily: "system-ui, -apple-system, Segoe UI", fontSize: "14px", color:"#a8c6ff" }).setAlpha(0.75);

    // Aim line (snap visual)
    this.ui.aim = this.add.graphics();

    // Input
    this.input.keyboard.on("keydown-J", () => this.shoot("j"));
    this.input.keyboard.on("keydown-L", () => this.shoot("ly"));
    this.input.keyboard.on("keydown-SPACE", () => this.shoot(this.lastWeapon));
    this.input.keyboard.on("keydown-LEFT", () => this.cycleTarget(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.cycleTarget(1));

    // Mobile: tap left/right half to shoot J/LY (optional)
    this.input.on("pointerdown", (p) => {
      if (p.x < W/2) this.shoot("j");
      else this.shoot("ly");
    });

    // Start with one obstacle
    this.spawnObstacle(true);
  }

  update(_, dtMs) {
    const dt = dtMs / 1000;

    // Spawn
    this.spawnTimer += dtMs;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle(false);
      // subtle ramp: faster spawns over time
      this.spawnInterval = Math.max(520, this.spawnInterval - 6);
      this.baseSpeed = Math.min(260, this.baseSpeed + 0.8);
    }

    // Move obstacles “towards player” (downwards + slight scale up = fake 3D)
    for (const o of this.obstacles) {
      o.y += o.speed * dt;
      o.z += dt * 0.9;
      const s = 0.78 + o.z * 0.55;
      o.container.setScale(s);
      o.container.setAlpha(clamp(0.25 + o.z * 1.2, 0.25, 1));
      o.container.setPosition(o.x, o.y);

      // Collide with player line (simple)
      if (!o.resolved && o.y > this.player.y - 10) {
        // player “hits” obstacle -> damage
        this.fail(o, "ÜTKÖZÉS!");
      }
    }

    // Move bullets
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.sprite.setPosition(b.x, b.y);
      b.life -= dtMs;
    }
    this.bullets = this.bullets.filter(b => {
      if (b.life <= 0) { b.sprite.destroy(); return false; }
      return true;
    });

    // Remove offscreen obstacles
    this.obstacles = this.obstacles.filter(o => {
      if (o.y > this.scale.height + 120) { o.container.destroy(); return false; }
      return true;
    });

    // Auto target lock
    this.refreshTargetLock();

    // Draw aim line + target highlight
    this.drawAim();

    // Check bullet hits
    this.checkHits();
  }

  spawnObstacle(initial) {
    const W = this.scale.width;
    const H = this.scale.height;

    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    const masked = makeMasked(w.full);

    // spawn at random x, slightly above view
    const x = Phaser.Math.Between(Math.floor(W*0.18), Math.floor(W*0.82));
    const y = initial ? H*0.25 : Phaser.Math.Between(-120, -40);

    const container = this.add.container(x, y);

    // bubble + glow
    const glow = this.add.circle(0, 0, 40, 0x7fb3ff, 0.10);
    const bubble = this.add.circle(0, 0, 34, 0x0b143a, 0.85);
    const ring = this.add.circle(0, 0, 36, 0x88bbff, 0.18);

    // masked text
    const text = this.add.text(0, 0, masked, {
      fontFamily: "system-ui, -apple-system, Segoe UI",
      fontSize: "22px",
      color: "#cfe9ff",
    }).setOrigin(0.5);

    container.add([glow, bubble, ring, text]);

    const o = {
      word: { ...w, masked },
      resolved: false,
      x, y,
      z: 0, // fake depth
      speed: this.baseSpeed + Phaser.Math.Between(0, 60),
      container,
      text,
      // for lock highlighting
      ring,
      glow,
      lastHitAt: 0
    };

    this.obstacles.push(o);
  }

  refreshTargetLock() {
    // Keep current target if still valid and ahead
    if (this.lockedTarget && this.obstacles.includes(this.lockedTarget) && !this.lockedTarget.resolved) {
      return;
    }
    // pick nearest ahead of player
    let best = null;
    let bestScore = Infinity;
    for (const o of this.obstacles) {
      if (o.resolved) continue;
      // prefer closer in y to player, and closer in x
      const dy = Math.max(0, this.player.y - o.y);
      const dx = Math.abs(this.player.x - o.x);
      const score = dy * 0.8 + dx * 0.6;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    this.lockedTarget = best;
  }

  cycleTarget(dir) {
    const candidates = this.obstacles.filter(o => !o.resolved);
    if (candidates.length === 0) {
      this.lockedTarget = null;
      return;
    }
    const currentIndex = candidates.indexOf(this.lockedTarget);
    if (currentIndex === -1) {
      this.lockedTarget = candidates[0];
      return;
    }
    const nextIndex = (currentIndex + dir + candidates.length) % candidates.length;
    this.lockedTarget = candidates[nextIndex];
  }

  shoot(weapon) {
    this.lastWeapon = weapon;
    this.refreshTargetLock();
    const target = this.lockedTarget;

    const startX = this.player.x;
    const startY = this.player.y - 8;
    const speed = 520;
    let vx = 0;
    let vy = -speed;

    if (target) {
      const dx = target.x - startX;
      const dy = target.y - startY;
      const len = Math.hypot(dx, dy) || 1;
      vx = (dx / len) * speed;
      vy = (dy / len) * speed;
    }

    const color = weapon === "j" ? 0x7bf2ff : 0xffd66e;
    const sprite = this.add.circle(startX, startY, 4, color, 0.95);
    this.bullets.push({
      x: startX,
      y: startY,
      vx,
      vy,
      weapon,
      life: 900,
      sprite,
    });
  }

  drawAim() {
    const g = this.ui.aim;
    g.clear();

    for (const o of this.obstacles) {
      o.ring.setAlpha(0.18);
      o.glow.setAlpha(0.10);
    }

    if (!this.lockedTarget || this.lockedTarget.resolved) return;

    g.lineStyle(1.5, 0x87b8ff, 0.5);
    g.beginPath();
    g.moveTo(this.player.x, this.player.y - 10);
    g.lineTo(this.lockedTarget.x, this.lockedTarget.y);
    g.strokePath();

    this.lockedTarget.ring.setAlpha(0.5);
    this.lockedTarget.glow.setAlpha(0.2);
  }

  checkHits() {
    for (const b of this.bullets) {
      for (const o of this.obstacles) {
        if (o.resolved) continue;
        const dx = b.x - o.x;
        const dy = b.y - o.y;
        if (Math.hypot(dx, dy) < 28) {
          b.life = 0;
          b.sprite.destroy();
          if (b.weapon === o.word.correct) {
            this.resolve(o);
          } else {
            this.fail(o, "HIBA!");
          }
          break;
        }
      }
    }
  }

  resolve(o) {
    if (o.resolved) return;
    o.resolved = true;
    o.container.destroy();
    this.score += 1;
    this.ui.score.setText(`Pont: ${this.score}`);
  }

  fail(o, _reason) {
    if (o.resolved) return;
    o.resolved = true;
    o.container.destroy();
    this.lives = Math.max(0, this.lives - 1);
    this.ui.lives.setText(`Élet: ${"♥".repeat(this.lives)}`);
    if (this.lives <= 0) {
      this.scene.restart();
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 900,
  height: 600,
  scene: [MainScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#070b16",
};

new Phaser.Game(config);
