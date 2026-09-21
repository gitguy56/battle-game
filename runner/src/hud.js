import { SLAM } from './slam.js';

const fmt = (t) => {
  const m = Math.floor(t / 60), s = t % 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};

export class HUD {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div id="r-timer"><b>0:00.00</b></div>
      <div id="r-chain"><span class="x">x</span><b>1</b><i></i></div>
      <div id="r-cross"><s></s><s></s><s></s><s></s></div>
      <div id="r-speed"><b>0</b><span>m/s</span></div>
      <div id="r-hint"></div>
      <div id="r-msg"></div>
      <div id="r-pace"></div>
      <div id="r-weapon"></div>`;
    this.timer = root.querySelector('#r-timer b');
    this.chain = root.querySelector('#r-chain');
    this.chainNum = root.querySelector('#r-chain b');
    this.chainBar = root.querySelector('#r-chain i');
    this.speed = root.querySelector('#r-speed b');
    this.cross = root.querySelector('#r-cross');
    this.msg = root.querySelector('#r-msg');
    this.pace = root.querySelector('#r-pace');
    this.weapon = root.querySelector('#r-weapon');
    this.hint = root.querySelector('#r-hint');
    this.msgT = 0;
  }

  say(text, secs = 1.4) {
    this.msg.textContent = text;
    this.msg.style.opacity = '1';
    this.msgT = secs;
  }

  setVisible(on) { this.root.style.opacity = on ? '1' : '0'; }

  // Green while you are ahead of gold, amber ahead of silver, otherwise plain.
  setPace(time, medals) {
    const g = medals.gold, s = medals.silver;
    this.pace.textContent = time <= g ? 'GOLD PACE' : time <= s ? 'SILVER PACE' : '';
    this.pace.className = time <= g ? 'gold' : time <= s ? 'silver' : '';
  }

  update(dt, { time, speed, chain, chainTimer, chainMax, armed, slamming, hasTarget,
               medals, weapon, mag, reserve, reloading, hint }) {
    if (weapon) {
      this.weapon.innerHTML = reloading
        ? `<b>${weapon}</b> <span class="rl">reloading</span>`
        : `<b>${weapon}</b> <span class="ammo">${mag}<i>/${reserve}</i></span>`;
    }
    this.timer.textContent = fmt(time);
    this.speed.textContent = Math.round(speed);
    // the number grows and warms as you go faster - speed should feel like something
    const f = Math.min(1, speed / 45);
    this.speed.style.fontSize = (34 + f * 22).toFixed(0) + 'px';
    this.speed.style.color = `hsl(${(48 - f * 48).toFixed(0)}, ${(20 + f * 70).toFixed(0)}%, ${(72 + f * 12).toFixed(0)}%)`;

    // The bar is how long you have before the run restarts, so it runs hot as
    // it empties rather than just fading away.
    if (chain > 0) {
      const frac = Math.max(0, chainTimer / (chainMax || SLAM.window));
      this.chain.style.opacity = '1';
      this.chainNum.textContent = chain;
      this.chainBar.style.transform = `scaleX(${frac.toFixed(3)})`;
      this.chain.classList.toggle('hot', armed && frac < 0.35);
      this.chain.classList.toggle('big', chain >= 5);
    } else {
      this.chain.style.opacity = '0';
    }
    this.cross.classList.toggle('slam', !!slamming);
    // Teach the one control that matters, at the moment it applies.
    this.hint.innerHTML = hint || '';
    this.hint.style.opacity = hint ? '1' : '0';

    this.cross.classList.toggle('on', !!hasTarget);
    this.setPace(time, medals);

    if (this.msgT > 0 && (this.msgT -= dt) <= 0) this.msg.style.opacity = '0';
  }
}
