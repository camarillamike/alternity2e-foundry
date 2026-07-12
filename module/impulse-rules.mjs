export const IMPULSES_PER_ROUND = 8;
export const ACTION_COSTS = Object.freeze({ interact: 1, reposition: 1, resist: 1, ready: 1, nothing: 1, move: 2, totalDefense: 3, skill: 3 });
export const INITIATIVE_RANK = Object.freeze({ Stellar: 4, Excellent: 3, Average: 2, Failure: 1, Surprised: 0, Unrolled: 0 });

export function absoluteTick(round = 1, impulse = 1) {
  const safeRound = Math.max(1, Math.trunc(Number(round) || 1)), safeImpulse = Math.max(1, Math.min(IMPULSES_PER_ROUND, Math.trunc(Number(impulse) || 1)));
  return (safeRound - 1) * IMPULSES_PER_ROUND + safeImpulse;
}

export function positionFromTick(tick = 1) {
  const safe = Math.max(1, Math.trunc(Number(tick) || 1));
  return { round: Math.floor((safe - 1) / IMPULSES_PER_ROUND) + 1, impulse: ((safe - 1) % IMPULSES_PER_ROUND) + 1 };
}

export function scheduleAfter(currentTick, cost = 1) { return Math.max(1, Math.trunc(Number(currentTick) || 1)) + Math.max(1, Math.trunc(Number(cost) || 1)); }
export function initialTick(degree) { return ["Failure", "Surprised", "Unrolled"].includes(degree) ? 2 : 1; }
export function initiativePriority(degree, roll = 0) { return (INITIATIVE_RANK[degree] || 0) * 1000 + Number(roll || 0); }
export function isReady(nextTick, currentTick) { return Number(nextTick || Infinity) <= Number(currentTick || 1); }
export function statusActionDelay(statuses = [], kind = "action") { return statuses.includes("dazed") || statuses.includes("slowed") && kind !== "resist" ? 1 : 0; }
export function nextRelevantTick(currentTick, scheduledTicks = []) {
  const current = Math.max(1, Math.trunc(Number(currentTick) || 1)), next = current + 1, roundStart = Math.floor((current - 1) / IMPULSES_PER_ROUND + 1) * IMPULSES_PER_ROUND + 1;
  const future = scheduledTicks.map(Number).filter(value => Number.isFinite(value) && value >= next);
  return Math.min(future.length ? Math.min(...future) : next, roundStart);
}

export function compareQueue(a, b) {
  const firstA = a.acted ? 1 : 0, firstB = b.acted ? 1 : 0;
  return Number(a.nextTick) - Number(b.nextTick) || firstA - firstB || Number(a.sequence) - Number(b.sequence) || String(a.id).localeCompare(String(b.id));
}
