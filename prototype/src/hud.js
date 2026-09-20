// The only overlay is the camera's own. No crosshair, no health bar, no ammo
// count, no hit markers, no minimap - see REALISM.md part 1.
export class HUD {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div id="bc-frame">
        <div class="bc-tl"><span id="bc-rec">&#9679;</span> REC</div>
        <div class="bc-tr"><span id="bc-batt">87%</span> <span class="bc-cell"></span></div>
        <div class="bc-bl" id="bc-time">--:--:--</div>
        <div class="bc-br">AXON-4 / UNIT 2-1</div>
      </div>
      <div id="bc-msg"></div>
      <div id="bc-center"></div>`;
    this.rec = root.querySelector('#bc-rec');
    this.time = root.querySelector('#bc-time');
    this.batt = root.querySelector('#bc-batt');
    this.msg = root.querySelector('#bc-msg');
    this.center = root.querySelector('#bc-center');
    this.t = 0;
    this.battery = 87;
    this.msgTimer = 0;
  }

  say(text, seconds = 2.2) {
    this.msg.textContent = text;
    this.msg.style.opacity = '1';
    this.msgTimer = seconds;
  }

  bigText(html) { this.center.innerHTML = html; this.center.style.opacity = '1'; }
  clearBig() { this.center.style.opacity = '0'; }

  update(dt) {
    this.t += dt;
    this.rec.style.opacity = (this.t % 1.4) < 0.75 ? '1' : '0.05';

    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    this.time.textContent =
      `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

    this.battery = Math.max(0, this.battery - dt * 0.018);
    this.batt.textContent = Math.floor(this.battery) + '%';

    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.msg.style.opacity = '0';
    }
  }
}
