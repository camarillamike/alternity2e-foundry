export const AUTHORITY = Object.freeze({ GM: "gm", OWNER: "owner", REQUEST: "request" });

export function isGM() { return Boolean(globalThis.game?.user?.isGM); }
export function controlsActor(actor) { return isGM() || Boolean(actor?.isOwner); }
export function canAdvanceWorldClock() { return isGM(); }
export function canConfigureActor(actor) {
  if (isGM()) return true;
  if (!actor?.isOwner || actor.type !== "hero") return false;
  return !actor.system?.build?.locked && Boolean(actor.system?.build?.advancementOpen || Number(actor.system?.level || 1) === 1);
}
export function canManageInventory(actor) {
  if (isGM()) return true;
  const policy = globalThis.game?.settings?.get?.("alternity2e", "inventoryAuthority") || AUTHORITY.OWNER;
  return policy === AUTHORITY.OWNER && Boolean(actor?.isOwner);
}
export function canApplyDamage(actor) {
  if (isGM()) return true;
  const policy = globalThis.game?.settings?.get?.("alternity2e", "damageAuthority") || AUTHORITY.REQUEST;
  return policy === AUTHORITY.OWNER && Boolean(actor?.isOwner);
}
export function canAwardResources() { return isGM(); }
export function canPlayActor(actor) { return controlsActor(actor); }
export function requireAuthority(allowed, message = "You do not have permission to do that.") {
  if (allowed) return true;
  globalThis.ui?.notifications?.warn?.(message);
  return false;
}

export function actorAccess(actor) {
  const gm = isGM(), owner = Boolean(actor?.isOwner);
  return {
    isGM: gm,
    isOwner: owner,
    canPlay: gm || owner,
    canSpendHeroPoints: gm || owner && actor?.type === "hero",
    canConfigure: canConfigureActor(actor),
    canInventory: canManageInventory(actor),
    canDamage: canApplyDamage(actor),
    canAward: gm,
    canAdvanceClock: gm,
    showPrivate: gm,
    delegated: !gm && owner && actor?.type !== "hero"
  };
}
