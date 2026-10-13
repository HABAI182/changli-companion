export type Signal =
  | 'key'
  | 'keyboard_left'
  | 'keyboard_right'
  | 'enter'
  | 'backspace'
  | 'space'
  | 'left'
  | 'right'
  | 'wheel'
  | 'move'
  | 'pet'
  | 'body'
  | 'complete';
export type Pose =
  | 'arrival'
  | 'idle'
  | 'keyboard_left'
  | 'keyboard_right'
  | 'mouse'
  | 'typing'
  | 'rapid'
  | 'stamp'
  | 'think'
  | 'left'
  | 'right'
  | 'scroll'
  | 'tea'
  | 'sleep'
  | 'blush'
  | 'celebrate';
export type Expression =
  | 'default'
  | 'smile'
  | 'think'
  | 'surprised'
  | 'resigned'
  | 'blush'
  | 'sleepy'
  | 'serious'
  | 'laugh'
  | 'angry'
  | 'pout'
  | 'shy'
  | 'wronged'
  | 'proud'
  | 'confused'
  | 'phoenix_eyes'
  | 'flame_eyes';
export interface Motion {
  priority: number;
  duration: number;
  expression: Expression;
}
export const motions: Record<Pose, Motion> = {
  keyboard_left: { priority: 3, duration: 220, expression: 'default' },
  keyboard_right: { priority: 3, duration: 220, expression: 'default' },
  mouse: { priority: 4, duration: 180, expression: 'default' },
  arrival: { priority: 1, duration: 1500, expression: 'smile' },
  idle: { priority: 0, duration: 0, expression: 'default' },
  typing: { priority: 3, duration: 420, expression: 'default' },
  rapid: { priority: 3, duration: 450, expression: 'serious' },
  stamp: { priority: 5, duration: 750, expression: 'smile' },
  think: { priority: 4, duration: 650, expression: 'think' },
  left: { priority: 3, duration: 350, expression: 'default' },
  right: { priority: 3, duration: 350, expression: 'default' },
  scroll: { priority: 3, duration: 500, expression: 'serious' },
  tea: { priority: 1, duration: 2500, expression: 'smile' },
  sleep: { priority: 0, duration: 0, expression: 'sleepy' },
  blush: { priority: 4, duration: 1300, expression: 'blush' },
  celebrate: { priority: 6, duration: 1500, expression: 'smile' },
};
export const eventMap: Record<Exclude<Signal, 'move'>, Pose> = {
  key: 'typing',
  keyboard_left: 'keyboard_left',
  keyboard_right: 'keyboard_right',
  enter: 'stamp',
  backspace: 'think',
  space: 'typing',
  left: 'mouse',
  right: 'mouse',
  wheel: 'scroll',
  pet: 'blush',
  body: 'blush',
  complete: 'celebrate',
};
export class CharacterMachine {
  pose: Pose = 'arrival';
  started: number;
  until: number;
  lastInput: number;
  lastPet = -Infinity;
  teaDone = false;
  hand = 0;
  keys: number[] = [];
  gaze = { x: 0, y: 0 };
  constructor(now: number) {
    this.started = now;
    this.until = now + 1500;
    this.lastInput = now;
  }
  signal(signal: Signal, now: number, x = 0, y = 0) {
    this.tick(now);
    if (signal === 'move') {
      this.gaze = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    }
    if (signal !== 'complete') {
      this.lastInput = now;
      this.teaDone = false;
    }
    if (signal === 'move') {
      if (this.pose === 'sleep' || this.pose === 'tea') this.set('idle', now);
      if (motions[this.pose].priority < 4) this.set('mouse', now);
      return;
    }
    if (signal === 'pet') {
      if (now - this.lastPet < 3000) return;
      this.lastPet = now;
    }
    let pose = eventMap[signal];
    if (signal === 'key') {
      this.keys = this.keys.filter((t) => now - t < 700);
      this.keys.push(now);
      this.hand = 1 - this.hand;
      if (this.keys.length >= 5) pose = 'rapid';
    }
    if (motions[pose].priority < motions[this.pose].priority) return;
    // Extend repetitive input without restarting the animation phase.
    if (pose === this.pose) {
      this.until = now + motions[pose].duration;
      return;
    }
    this.set(pose, now);
  }
  set(pose: Pose, now: number) {
    this.pose = pose;
    this.started = now;
    this.until = now + motions[pose].duration;
  }
  tick(now: number) {
    if (this.until && now >= this.until && motions[this.pose].duration) this.set('idle', now);
    if (motions[this.pose].priority > 0) return;
    if (now - this.lastInput >= 180000) {
      if (this.pose !== 'sleep') this.set('sleep', now);
    } else if (now - this.lastInput >= 60000 && !this.teaDone) {
      this.teaDone = true;
      this.set('tea', now);
    }
  }
}
export type Session = {
  id: string;
  durationMs: number;
  remainingMs: number;
  status: 'running' | 'paused';
  deadline: number;
};
export type RecordEntry = { id: string; minutes: number; completedAt: number; day: string };
export type Todo = { id: string; text: string; done: boolean; day: string };
export type Settings = {
  settingsTheme: 'system' | 'light' | 'dark';
  accentColor: 'coral' | 'blue' | 'violet' | 'sage';
  settingsDensity: 'comfortable' | 'compact';
  cursorFollowEnabled: boolean;
  headElasticity: number;
  keyboardMotionScale: number;
  keyboardHandSpeed: number;
  mouseMotionScale: number;
  bubbleDurationSeconds: number;
  bubbleIdleIntervalSeconds: 0 | 60 | 90 | 180;
  dragReactionsEnabled: boolean;
  fullscreenHideEnabled: boolean;
  fullscreenExceptions: string[];
  edgeSnapEnabled: boolean;
  mouseDetailsEnabled: boolean;
  scale: number;
  topmost: boolean;
  passthrough: boolean;
  motion: 'full' | 'low' | 'off';
  rendererMode: 'auto' | 'live2d' | 'layered2d';
  bubblesEnabled: boolean;
  fps: 30 | 60;
  autostart: boolean;
  shortcut: string;
  inputMode: 'keyboard_mouse' | 'keyboard_only';
  keyOverlayEnabled: boolean;
  multiKeyOverlayEnabled: boolean;
  autoSleepMinutes: 0 | 5 | 10 | 15;
  hoverHideEnabled: boolean;
  hoverHideDelayMs: 250 | 500 | 1000;
  hoverHideOpacity: 0.2 | 0.4 | 0.6;
  gamepadEnabled: boolean;
  sfxEnabled: boolean;
  sfxVolume: number;
  voiceEnabled: boolean;
  voiceVolume: number;
  keyboardSfxEnabled: boolean;
};
export type Data = {
  version: 1;
  todos: Todo[];
  priority: string | null;
  session: Session | null;
  records: RecordEntry[];
  settings: Settings;
};
export const localDay = (time: number) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function initialData(): Data {
  return {
    version: 1,
    todos: [],
    priority: null,
    session: null,
    records: [],
    settings: {
      settingsTheme: 'system',
      accentColor: 'coral',
      settingsDensity: 'comfortable',
      cursorFollowEnabled: true,
      headElasticity: 1,
      keyboardMotionScale: 1,
      keyboardHandSpeed: 1,
      mouseMotionScale: 1,
      bubbleDurationSeconds: 3,
      bubbleIdleIntervalSeconds: 90,
      dragReactionsEnabled: true,
      fullscreenHideEnabled: true,
      fullscreenExceptions: [],
      edgeSnapEnabled: true,
      mouseDetailsEnabled: true,
      scale: 1,
      topmost: true,
      passthrough: false,
      motion: 'full',
      rendererMode: 'auto',
      bubblesEnabled: true,
      fps: 30,
      autostart: false,
      shortcut: 'Ctrl+Shift+F10',
      inputMode: 'keyboard_mouse',
      keyOverlayEnabled: true,
      multiKeyOverlayEnabled: false,
      autoSleepMinutes: 0,
      hoverHideEnabled: false,
      hoverHideDelayMs: 500,
      hoverHideOpacity: 0.4,
      gamepadEnabled: false,
      sfxEnabled: false,
      sfxVolume: 0.35,
      voiceEnabled: false,
      voiceVolume: 0.5,
      keyboardSfxEnabled: false,
    },
  };
}
export function startSession(minutes: number, now: number, id: string): Session {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) throw Error('时长须为 1–240 分钟');
  const durationMs = Math.round(minutes * 60000);
  return { id, durationMs, remainingMs: durationMs, status: 'running', deadline: now + durationMs };
}
export const remaining = (s: Session, now: number) =>
  s.status === 'paused' ? s.remainingMs : Math.max(0, s.deadline - now);
export const formatRemaining = (ms: number) => {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
export function pause(s: Session, now: number): Session {
  return s.status === 'paused' ? s : { ...s, status: 'paused', remainingMs: remaining(s, now) };
}
export function resume(s: Session, now: number): Session {
  return s.status === 'running' ? s : { ...s, status: 'running', deadline: now + s.remainingMs };
}
export function settle(data: Data, now: number): boolean {
  const s = data.session;
  if (!s || s.status !== 'running' || now < s.deadline) return false;
  const fresh = !data.records.some((r) => r.id === s.id);
  if (fresh)
    data.records.push({
      id: s.id,
      minutes: s.durationMs / 60000,
      completedAt: s.deadline,
      day: localDay(s.deadline),
    });
  data.session = null;
  return fresh;
}
export function addTodo(data: Data, text: string, now: number, id: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) throw Error('请输入 1–500 个字符');
  data.todos.push({ id, text: trimmed, done: false, day: localDay(now) });
}
export function parseData(raw: string): Data {
  const d = JSON.parse(raw) as Data;
  if (d.version !== 1 || !Array.isArray(d.todos) || !Array.isArray(d.records) || !d.settings)
    throw Error('本地数据格式无法识别，请保留数据后恢复');
  if (
    d.todos.some(
      (t) => typeof t.id !== 'string' || typeof t.text !== 'string' || typeof t.done !== 'boolean',
    ) ||
    d.records.some((r) => !Number.isFinite(r.minutes) || typeof r.id !== 'string')
  )
    throw Error('本地数据校验失败');
  if (
    d.session &&
    (!Number.isFinite(d.session.deadline) ||
      !Number.isFinite(d.session.durationMs) ||
      !Number.isFinite(d.session.remainingMs) ||
      !['running', 'paused'].includes(d.session.status))
  )
    throw Error('专注数据校验失败');
  d.settings = { ...initialData().settings, ...d.settings };
  return d;
}
