export const WOUND_ROWS = ["graze", "light", "moderate", "serious", "critical", "mortal"];
export const DAMAGE_BANDS = { graze: [1, 3], light: [4, 6], moderate: [7, 9], serious: [10, 12], critical: [13, 15], mortal: [16, Infinity] };

export const damageSeverity = value => WOUND_ROWS.find(row => value >= DAMAGE_BANDS[row][0] && value <= DAMAGE_BANDS[row][1]) ?? null;
export function woundPenalty(wounds) { return wounds.critical ? -3 : wounds.serious ? -2 : wounds.moderate ? -1 : 0; }
export function durability(vitality, bonuses = {}) {
  const rows = WOUND_ROWS.slice(0, 5), out = { graze: 1, light: 1, moderate: 1, serious: 1, critical: 1, mortal: 1 };
  for (let i = 1; i <= vitality; i++) out[rows[(i - 1) % 5]]++;
  for (const [row, value] of Object.entries(bonuses)) if (row in out) out[row] += Number(value || 0);
  return out;
}
export function applyWound(wounds, track, severity) {
  if (!severity) return { severity: null, escalated: false };
  let index = WOUND_ROWS.indexOf(severity);
  while (index < WOUND_ROWS.length - 1 && wounds[WOUND_ROWS[index]] >= track[WOUND_ROWS[index]]) index++;
  const applied = WOUND_ROWS[index]; wounds[applied] = Math.min(track[applied], Number(wounds[applied] || 0) + 1);
  return { severity: applied, escalated: applied !== severity };
}
export function parseDamage(expression) {
  const match = String(expression).match(/^(\d+)d(\d+)([+-]\d+)?(?:\/(\d+))?/i);
  return match ? { dice: `${match[1]}d${match[2]}`, averageBonus: Number(match[3] || 0), excellentBonus: Number(match[4] || 0) } : null;
}
export function skillTarget(ability, ranks) { return 20 - Number(ability || 0) - Number(ranks || 0); }
export function stepFormula(steps = 0) { const n = Math.trunc(Number(steps) || 0); if (!n) return "1d20"; const dice = ["1d4", "1d6", "1d8", "1d12", "1d20"], magnitude = Math.abs(n), parts = magnitude <= 5 ? dice[magnitude - 1] : `${magnitude - 4}d20`; return `1d20 ${n > 0 ? "+" : "-"} ${parts}`; }
export function rollDegree(total, target) { return total >= target + 10 ? "Stellar" : total >= target + 5 ? "Excellent" : total >= target ? "Average" : "Failure"; }
