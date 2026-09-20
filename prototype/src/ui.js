import { DIFFICULTIES } from './settings.js';

// Menus, pause, settings and the after-action screen. Plain DOM over the canvas.
export class UI {
  constructor(root, settings) {
    this.root = root;
    this.settings = settings;
    this.on = {};                 // play / resume / restart / quit / apply
    this.current = null;
    root.innerHTML = `
      <div class="screen" data-screen="menu">
        <div class="panel">
          <h1>Unit 2-1</h1>
          <p class="sub">Chest camera &middot; take the compound</p>
          <div class="rows" id="ui-diff"></div>
          <div class="acts">
            <button data-act="play" class="primary">Start mission</button>
            <button data-act="settings">Settings</button>
          </div>
          <p class="hint" id="ui-hint"></p>
        </div>
      </div>

      <div class="screen" data-screen="settings">
        <div class="panel">
          <h2>Settings</h2>
          <div class="rows" id="ui-settings"></div>
          <div class="acts"><button data-act="back" class="primary">Back</button></div>
        </div>
      </div>

      <div class="screen" data-screen="pause">
        <div class="panel">
          <h2>Paused</h2>
          <div class="acts col">
            <button data-act="resume" class="primary">Resume</button>
            <button data-act="settings">Settings</button>
            <button data-act="restart">Restart mission</button>
            <button data-act="quit">Quit to menu</button>
          </div>
        </div>
      </div>

      <div class="screen" data-screen="results">
        <div class="panel">
          <h2 id="ui-outcome">Mission complete</h2>
          <div class="stats" id="ui-stats"></div>
          <div class="acts">
            <button data-act="restart" class="primary">Run it again</button>
            <button data-act="quit">Menu</button>
          </div>
        </div>
      </div>`;

    this.screens = {};
    for (const el of root.querySelectorAll('.screen')) this.screens[el.dataset.screen] = el;

    root.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'settings') { this.returnTo = this.current; this.show('settings'); }
      else if (act === 'back') this.show(this.returnTo || 'menu');
      else this.on[act]?.();
    });

    this.buildDifficulty();
    this.buildSettings();
  }

  buildDifficulty() {
    const box = this.root.querySelector('#ui-diff');
    box.className = 'rows choice';
    box.innerHTML = '<span class="lbl">Difficulty</span><div class="opts"></div>';
    const opts = box.querySelector('.opts');
    for (const [key, d] of Object.entries(DIFFICULTIES)) {
      const b = document.createElement('button');
      b.textContent = d.label;
      b.className = 'chip';
      b.onclick = () => {
        this.settings.set('difficulty', key);
        this.buildDifficulty();
      };
      if (this.settings.get('difficulty') === key) b.classList.add('on');
      opts.appendChild(b);
    }
    const d = this.settings.difficulty;
    this.root.querySelector('#ui-hint').textContent =
      `${d.garrison} in the compound, ${d.counter} in the counter-attack. You can take ${d.playerHp} hits.`;
  }

  buildSettings() {
    const box = this.root.querySelector('#ui-settings');
    box.innerHTML = '';
    const slider = (key, label, min, max, step, fmt) => {
      const row = document.createElement('label');
      row.className = 'row';
      row.innerHTML = `<span class="lbl">${label}</span>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${this.settings.get(key)}">
        <output></output>`;
      const input = row.querySelector('input'), out = row.querySelector('output');
      const paint = () => { out.textContent = fmt(+input.value); };
      input.oninput = () => { this.settings.set(key, +input.value); paint(); this.on.apply?.(); };
      paint();
      box.appendChild(row);
    };
    const toggle = (key, label, note) => {
      const row = document.createElement('label');
      row.className = 'row';
      row.innerHTML = `<span class="lbl">${label}</span>
        <button class="chip ${this.settings.get(key) ? 'on' : ''}" type="button">
          ${this.settings.get(key) ? 'On' : 'Off'}</button>
        <output>${note || ''}</output>`;
      const b = row.querySelector('button');
      b.onclick = () => {
        this.settings.set(key, this.settings.get(key) ? 0 : 1);
        this.buildSettings();
        this.on.apply?.();
      };
      box.appendChild(row);
    };
    slider('sensitivity', 'Mouse sensitivity', 0.0005, 0.006, 0.0001, v => (v * 1000).toFixed(1));
    slider('fov', 'Field of view', 60, 105, 1, v => v + '°');
    slider('volume', 'Volume', 0, 1, 0.05, v => Math.round(v * 100) + '%');
    toggle('filter', 'Camera filter', 'grain, lens, vignette');
    toggle('invertY', 'Invert vertical aim', '');
  }

  setResults(r) {
    this.root.querySelector('#ui-outcome').textContent = r.win ? 'Extracted' : 'Killed in action';
    const acc = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
    const mm = String(Math.floor(r.time / 60)).padStart(2, '0');
    const ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    this.root.querySelector('#ui-stats').innerHTML = `
      <div><b>${r.kills}</b><span>enemies down</span></div>
      <div><b>${mm}:${ss}</b><span>time</span></div>
      <div><b>${acc}%</b><span>accuracy</span></div>
      <div><b>${r.shots}</b><span>rounds fired</span></div>`;
  }

  show(name) {
    this.current = name;
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('on', k === name);
    this.root.classList.toggle('on', !!name);
    if (name === 'menu') this.buildDifficulty();
    if (name === 'settings') this.buildSettings();
  }
}
