// Player settings, remembered between sessions. localStorage can throw or come
// back empty (private windows, blocked site data), so every access is guarded
// and the defaults always work on their own.
const KEY = 'unit21.settings.v1';

export const DIFFICULTIES = {
  recruit:  { label: 'Recruit',  enemyAccuracy: 0.62, garrison: 4, counter: 3, playerHp: 5 },
  regular:  { label: 'Regular',  enemyAccuracy: 1.00, garrison: 6, counter: 4, playerHp: 4 },
  veteran:  { label: 'Veteran',  enemyAccuracy: 1.35, garrison: 8, counter: 6, playerHp: 3 },
};

const DEFAULTS = {
  sensitivity: 0.0022,
  fov: 78,
  filter: 1,
  invertY: 0,
  difficulty: 'regular',
  volume: 0.7,
};

export class Settings {
  constructor() {
    this.values = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch { /* fine - defaults stand */ }
  }
  get(k) { return this.values[k]; }
  set(k, v) {
    this.values[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(this.values)); } catch { /* ignore */ }
  }
  get difficulty() { return DIFFICULTIES[this.values.difficulty] || DIFFICULTIES.regular; }
}
