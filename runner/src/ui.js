const fmt = (t) => {
  const m = Math.floor(t / 60), s = t % 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};

export class UI {
  constructor(root) {
    this.root = root;
    this.on = {};
    root.innerHTML = `
      <div class="screen" data-screen="menu">
        <div class="panel">
          <h1>Chainrunner</h1>
          <p class="sub">Take their place &middot; come out faster</p>
          <div class="how">
            <div><b>W A S D</b><span>move</span></div>
            <div><b>Space</b><span>jump on the ground &mdash; <b>slam</b> in the air</span></div>
            <div><b>Left mouse</b><span>shoot &mdash; clears anything out of reach</span></div>
            <div><b>Right mouse</b><span>aim</span></div>
            <div><b>Q</b><span>swap weapon</span></div>
            <div><b>R</b><span>reload</span></div>
            <div><b>Backspace</b><span>restart instantly</span></div>
          </div>
          <p class="hint">Slam down onto someone and the impact kills them and throws
            you back up &mdash; the further you fell, the higher you go. Land another
            before the bar empties. <b>Lose the chain and the run restarts.</b></p>
          <div class="acts"><button data-act="play" class="primary">Run it</button></div>
          <p class="best" id="ui-best"></p>
        </div>
      </div>
      <div class="screen" data-screen="results">
        <div class="panel">
          <div class="medal" id="ui-medal">—</div>
          <h2 id="ui-time">0:00.00</h2>
          <div class="stats" id="ui-stats"></div>
          <div class="acts">
            <button data-act="play" class="primary">Again</button>
            <button data-act="menu">Menu</button>
          </div>
        </div>
      </div>`;
    this.screens = {};
    for (const el of root.querySelectorAll('.screen')) this.screens[el.dataset.screen] = el;
    root.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (b) this.on[b.dataset.act]?.();
    });
  }

  static medal(time, m) {
    if (time <= m.gold) return { name: 'GOLD', cls: 'gold' };
    if (time <= m.silver) return { name: 'SILVER', cls: 'silver' };
    if (time <= m.bronze) return { name: 'BRONZE', cls: 'bronze' };
    return { name: 'FINISHED', cls: 'none' };
  }

  setBest(best, medals) {
    const el = this.root.querySelector('#ui-best');
    if (!best) {
      el.textContent = `Gold ${fmt(medals.gold)} · Silver ${fmt(medals.silver)} · Bronze ${fmt(medals.bronze)}`;
      return;
    }
    const m = UI.medal(best, medals);
    el.innerHTML = `Your best <b>${fmt(best)}</b> <span class="${m.cls}">${m.name}</span>` +
      ` &middot; gold is ${fmt(medals.gold)}`;
  }

  setResults(r) {
    const m = UI.medal(r.time, r.medals);
    const badge = this.root.querySelector('#ui-medal');
    badge.textContent = m.name;
    badge.className = 'medal ' + m.cls;
    this.root.querySelector('#ui-time').textContent = fmt(r.time);
    const delta = r.best != null && r.time < r.best ? 'new best' :
      (r.best != null ? `+${(r.time - r.best).toFixed(2)}s off your best` : 'first run');
    this.root.querySelector('#ui-stats').innerHTML = `
      <div><b>${r.bestChain}</b><span>longest chain</span></div>
      <div><b>${r.hops}</b><span>slams</span></div>
      <div><b>${r.accuracy}%</b><span>accuracy</span></div>
      <div><b>${Math.round(r.topSpeed)}</b><span>top speed m/s</span></div>
      <div><b>${r.falls}</b><span>attempts</span></div>
      <div class="wide"><b>${delta}</b><span>gold is ${fmt(r.medals.gold)}</span></div>`;
  }

  show(name) {
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('on', k === name);
    this.root.classList.toggle('on', !!name);
  }
}
