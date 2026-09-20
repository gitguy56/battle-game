import { MAX_HP } from './weapon.js';

// Clean and readable: a crosshair that opens with your spread, four health
// pips, and brief feedback when a shot connects.
export class HUD {
  constructor(root) {
    root.innerHTML = `
      <div id="bc-frame">
        <div class="bc-tl"><span id="bc-rec">&#9679;</span> REC</div>
        <div class="bc-tr"><span id="bc-batt">87%</span></div>
        <div class="bc-bl" id="bc-time">--:--:--</div>
        <div class="bc-br">UNIT 2-1</div>
      </div>
      <div id="bc-cross">
        <i class="ch-u"></i><i class="ch-d"></i><i class="ch-l"></i><i class="ch-r"></i>
        <b id="bc-hit"></b>
      </div>
      <div id="bc-hp"></div>
      <div id="bc-msg"></div>
      <div id="bc-center"></div>`;
    this.rec = root.querySelector('#bc-rec');
    this.time = root.querySelector('#bc-time');
    this.batt = root.querySelector('#bc-batt');
    this.msg = root.querySelector('#bc-msg');
    this.center = root.querySelector('#bc-center');
    this.cross = root.querySelector('#bc-cross');
    this.hit = root.querySelector('#bc-hit');
    this.hpBox = root.querySelector('#bc-hp');

    this.pips = [];
    for (let i = 0; i < MAX_HP; i++) {
      const p = document.createElement('i');
      this.hpBox.appendChild(p);
      this.pips.push(p);
    }
    this.t = 0; this.battery = 87; this.msgTimer = 0; this.hitTimer = 0;
  }

  say(text, seconds = 2.2) {
    this.msg.textContent = text;
    this.msg.style.opacity = '1';
    this.msgTimer = seconds;
  }

  markHit(head) {
    this.hit.style.opacity = '1';
    this.hit.style.color = head ? '#ff6a5a' : '#ffffff';
    this.hit.style.transform = `scale(${head ? 1.5 : 1})`;
    this.hitTimer = 0.22;
  }

  setHealth(hp) {
    this.pips.forEach((p, i) => p.classList.toggle('off', i >= hp));
  }

  showCrosshair(on) { this.cross.style.opacity = on ? '1' : '0'; }

  // spread is the cone half-angle in radians; convert it to pixels so the
  // crosshair actually shows how accurate the next shot will be.
  update(dt, spread = 0, fovDeg = 88, viewH = 720) {
    this.t += dt;
    this.rec.style.opacity = (this.t % 1.4) < 0.75 ? '1' : '0.08';

    const focal = (viewH / 2) / Math.tan((fovDeg * Math.PI / 180) / 2);
    const gap = Math.max(3.5, Math.tan(spread) * focal + 2.5);
    this.cross.style.setProperty('--gap', gap.toFixed(1) + 'px');

    const d = new Date(), p = n => String(n).padStart(2, '0');
    this.time.textContent =
      `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

    this.battery = Math.max(0, this.battery - dt * 0.018);
    this.batt.textContent = Math.floor(this.battery) + '%';

    if (this.msgTimer > 0 && (this.msgTimer -= dt) <= 0) this.msg.style.opacity = '0';
    if (this.hitTimer > 0 && (this.hitTimer -= dt) <= 0) this.hit.style.opacity = '0';
  }

  bigText(html) { this.center.innerHTML = html; this.center.style.opacity = '1'; }
}
