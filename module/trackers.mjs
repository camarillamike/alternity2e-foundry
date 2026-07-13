export const SUCCESS_VALUE = Object.freeze({ Failure: 0, Average: 1, Excellent: 2, Stellar: 3 });
export const ATTITUDES = Object.freeze(["hostile", "suspicious", "indifferent", "helpful", "friendly"]);

export function newMortality(lethality = "standard", currentTick = 1) {
  if (lethality === "low") return { active: true, dead: false, lethality, successes: 0, failures: 0, strikes: 0, interval: "4 hours", nextTick: 0, stabilized: false };
  return { active: true, dead: false, lethality, successes: 0, failures: 0, strikes: 0, interval: lethality === "high" ? "immediate" : "3 impulses", nextTick: lethality === "high" ? currentTick : currentTick + 3, stabilized: false };
}

export function advanceMortality(state, succeeded, currentTick = 1) {
  const next = { ...state };
  if (!next.active || next.dead) return next;
  if (next.lethality === "low") {
    if (succeeded) { next.active = false; next.stabilized = true; next.interval = "recovered"; }
    else { next.strikes = Number(next.strikes || 0) + 1; next.dead = next.strikes >= 3; }
    return next;
  }
  if (next.lethality === "high" && next.interval === "immediate" && !succeeded) { next.dead = true; next.active = false; return next; }
  if (succeeded) next.successes = Number(next.successes || 0) + 1; else next.failures = Number(next.failures || 0) + 1;
  if (next.failures >= 3) { next.dead = true; next.active = false; next.interval = "dead"; return next; }
  if (next.successes >= 3) { next.active = false; next.stabilized = true; next.interval = "recovered"; return next; }
  next.stabilized = next.successes >= 1;
  next.interval = next.successes >= 2 ? "8 hours" : next.successes >= 1 ? "1 hour" : "3 impulses";
  next.nextTick = next.interval === "3 impulses" ? currentTick + 3 : 0;
  return next;
}

export function newChallenge({ name = "Challenge", skillId = "", target = 3, failureLimit = 3, interval = "1 action", ownerId = "", secret = false } = {}) {
  return { id: globalThis.foundry?.utils?.randomID?.() || Math.random().toString(36).slice(2), name, skillId, target, failureLimit, successes: 0, failures: 0, interval, ownerId, secret, complete: false, failed: false };
}
export function advanceChallenge(challenge, degree) {
  const next = { ...challenge }, value = SUCCESS_VALUE[degree] || 0;
  if (degree === "Failure") next.failures = Number(next.failures || 0) + 1; else next.successes = Number(next.successes || 0) + value;
  next.complete = next.successes >= Number(next.target || 1);
  next.failed = next.failures >= Number(next.failureLimit || 3);
  return next;
}

export function rangeCategory(distance) {
  const value = Number(distance || 0);
  if (value <= 2) return "Adjacent";
  if (value <= 20) return "Close";
  if (value <= 50) return "Medium";
  if (value <= 200) return "Long";
  if (value <= 500) return "Very Long";
  if (value <= 2000) return "Extreme";
  return "Beyond";
}
const RANGE_ORDER = Object.freeze(["Adjacent", "Close", "Medium", "Long", "Very Long", "Extreme"]);
export function rangeAttackSteps(distance, maximum) {
  const category = rangeCategory(distance), index = RANGE_ORDER.indexOf(category), maximumIndex = RANGE_ORDER.indexOf(maximum);
  if (index < 0 || maximumIndex < 0 || index > maximumIndex) return { allowed: false, category, steps: 0 };
  return { allowed: true, category, steps: index <= 1 ? 0 : -(index - 1) };
}

export function coverSteps(percent = 0, { soft = false } = {}) {
  const value = Number(percent || 0);
  if (value >= 100) return { total: true, steps: -Infinity };
  let steps = value >= 90 ? -5 : value >= 75 ? -3 : value >= 50 ? -2 : value >= 25 ? -1 : 0;
  if (soft && steps < 0) steps += 1;
  return { total: false, steps };
}

export function attitudeAfter(attitude, degree, worsenOnFailure = false) {
  const index = Math.max(0, ATTITUDES.indexOf(attitude));
  if (degree === "Failure") return ATTITUDES[Math.max(0, index - (worsenOnFailure ? 1 : 0))];
  const shifts = degree === "Stellar" ? 2 : degree === "Excellent" ? (index <= 1 ? 1 : 2) : index <= 2 ? 1 : 0;
  return ATTITUDES[Math.min(ATTITUDES.length - 1, index + shifts)];
}

export function effectExpired(effect, currentTick) { return effect.durationType === "impulses" && Number(effect.expiresTick || 0) > 0 && Number(effect.expiresTick) <= Number(currentTick); }
