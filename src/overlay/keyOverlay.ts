export interface KeyDisplay {
  label: string;
  phase: 'down' | 'up';
  repeat?: boolean;
}
export interface KeyBadge {
  label: string;
  id: number;
  expiresAt: number;
}
export const KEY_BADGE_MS = 1500;
export const MAX_KEY_BADGES = 6;
const allowed =
  /^(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|Enter|Backspace|Space|Tab|Esc|Shift|Ctrl|Alt|CapsLock|[←↑→↓]|Home|End|PageUp|PageDown|Insert|Delete|[;,./=\-`\[\]\\'])$/;

// One ephemeral display token, never appended to Data or stored in a history.
export function nextKeyBadge(
  key: KeyDisplay | undefined,
  now: number,
  previous?: KeyBadge,
): KeyBadge | undefined {
  if (!key || key.phase !== 'down' || !allowed.test(key.label)) return previous;
  return { label: key.label, id: (previous?.id ?? 0) + 1, expiresAt: now + KEY_BADGE_MS };
}
export function visibleKeyBadge(badge: KeyBadge | undefined, now: number) {
  return badge && now < badge.expiresAt ? badge : undefined;
}

// Optional short-lived visual trail. It stays bounded in memory and is never
// persisted, joined into text, logged or transmitted.
export function nextKeyBadges(
  key: KeyDisplay | undefined,
  now: number,
  current: KeyBadge[],
  multiple: boolean,
  repeatEnabled = false,
): KeyBadge[] {
  if (key?.repeat && !repeatEnabled) return current;
  const previous = current.at(-1);
  const badge = nextKeyBadge(key, now, previous);
  if (!badge || badge === previous) return current;
  return multiple
    ? [...current.filter((item) => item.expiresAt > now), badge].slice(-MAX_KEY_BADGES)
    : [badge];
}
