// Deterministic per-user colors so the calendar can paint each person's tasks a
// distinct, stable hue — the same user is always the same color across sessions
// and views. Colors are drawn from a fixed, high-contrast palette by hashing the
// user id, so no server round-trip or shared state is needed.

const PALETTE = [
  '#4263eb', // indigo
  '#f76707', // orange
  '#2f9e44', // green
  '#e64980', // pink
  '#7048e8', // violet
  '#1098ad', // cyan
  '#f59f00', // yellow
  '#e03131', // red
  '#0ca678', // teal
  '#ae3ec9', // grape
  '#4c6ef5', // blue
  '#74b816', // lime
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Returns a stable hex color for a given user id (or a neutral gray if null). */
export function colorForUser(userId: string | null): string {
  if (!userId) {
    return '#868e96';
  }
  return PALETTE[hash(userId) % PALETTE.length];
}
