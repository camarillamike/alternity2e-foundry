import { canApplyDamage } from "./authority.mjs";

const CHANNEL = "system.alternity2e";
const activeGM = () => game.users.filter(user => user.isGM && user.active).sort((a, b) => a.id.localeCompare(b.id))[0];

export function damagePacket(button) {
  return { raw: Number(button.dataset.alternityDamage), type: button.dataset.damageType, woundHits: Number(button.dataset.woundHits || 1), armorPenetration: Number(button.dataset.armorPenetration || 0), armorBonus: Number(button.dataset.armorBonus || 0), conditions: String(button.dataset.conditions || "").split(",").filter(Boolean), nonlethal: button.dataset.nonlethal === "true", naturalAttack: button.dataset.naturalAttack === "true", weaponTechEra: Number(button.dataset.weaponTechEra || 0), attackDegree: button.dataset.attackDegree || "Average" };
}

export async function applyOrRequestDamage(actor, packet) {
  if (canApplyDamage(actor)) return actor.applyDamage(packet.raw, packet.type, packet);
  const gm = activeGM(); if (!gm) return ui.notifications.error("No active GM is available to approve damage.");
  game.socket.emit(CHANNEL, { type: "damageRequest", id: foundry.utils.randomID(), senderId: game.user.id, actorUuid: actor.uuid, actorName: actor.name, packet });
  ui.notifications.info(`Sent ${packet.raw} damage against ${actor.name} to the GM for approval.`);
}

export async function recordOrRequestChallenge(actor, challengeId, degree) {
  if (game.user.isGM) return actor.advanceChallenge(challengeId, degree);
  const gm = activeGM(); if (!gm) return ui.notifications.error("No active GM is available to record the challenge result.");
  game.socket.emit(CHANNEL, { type: "challengeResult", actorUuid: actor.uuid, challengeId, degree, senderId: game.user.id });
  ui.notifications.info("Sent the challenge result to the GM tracker.");
}

export function registerAuthoritySocket() {
  game.socket.on(CHANNEL, async request => {
    if (activeGM()?.id !== game.user.id) return;
    if (request.type === "deviceUse") { const actor = await fromUuid(request.actorUuid), item = actor?.items.get(request.itemId); if (!item || request.device !== "displacer-unit") return; const metadata = foundry.utils.deepClone(item.system.metadata || {}); metadata.sceneUsed = true; await item.update({ "system.metadata": metadata }); return; }
    if (request.type === "challengeResult") { const actor = await fromUuid(request.actorUuid), sender = game.users.get(request.senderId); if (actor?.testUserPermission(sender, "OWNER") && actor.system.play.challenges.some(challenge => challenge.id === request.challengeId)) await actor.advanceChallenge(request.challengeId, request.degree); return; }
    if (request.type !== "damageRequest") return;
    const data = encodeURIComponent(JSON.stringify(request.packet));
    await ChatMessage.create({ whisper: [game.user.id], content: `<section class="a2e-damage-request"><strong>Damage approval: ${request.actorName}</strong><p>${request.packet.raw} ${request.packet.type}; ${request.packet.woundHits} wound hit(s).</p><button type="button" data-a2e-approve-damage data-actor-uuid="${request.actorUuid}" data-packet="${data}">Approve damage</button><button type="button" data-a2e-deny-damage>Deny</button></section>` });
  });
}

export async function approveDamageButton(button) {
  if (!game.user.isGM) return;
  const actor = await fromUuid(button.dataset.actorUuid), packet = JSON.parse(decodeURIComponent(button.dataset.packet));
  if (!actor) return ui.notifications.error("The requested damage target no longer exists.");
  await actor.applyDamage(packet.raw, packet.type, packet); button.disabled = true; button.textContent = "Applied";
}

export async function resolveBlastButton(button) {
  const packet = JSON.parse(decodeURIComponent(button.dataset.a2eResolveBlast)), actor = await fromUuid(packet.actorUuid);
  if (!actor || !(game.user.isGM || actor.isOwner)) return ui.notifications.warn("Only the target's owner or the GM can resolve this blast reaction.");
  const token = canvas.tokens?.get(packet.tokenId), cover = Number(token?.document.getFlag("alternity2e", "cover") || 0), coverBonus = cover >= 90 ? 5 : cover >= 75 ? 3 : cover >= 50 ? 2 : cover >= 25 ? 1 : 0, skill = packet.areaEffect ? "endurance" : "dodge", check = await actor.rollSkill(skill, { label: packet.areaEffect ? "Resist area effect" : "Evade blast", steps: coverBonus }), shifts = { Failure: 0, Average: 2, Excellent: 4, Stellar: 6 }, effectiveDistance = Number(packet.distance) + (packet.areaEffect ? 0 : shifts[check.degree]);
  if (!packet.areaEffect && check.degree !== "Failure" && game.combat?.started) { const combatant = game.combat.combatantForActor?.(actor); if (combatant) await game.combat.delayNextAction(combatant, 1, "Evade blast reaction"); }
  let raw = effectiveDistance <= Number(packet.primaryRadius) ? Number(packet.primaryDamage) : effectiveDistance <= Number(packet.secondaryRadius) ? Number(packet.secondaryDamage) : 0;
  if (packet.areaEffect && check.degree !== "Failure") raw = 0;
  if (!packet.areaEffect && (check.degree !== "Failure" || raw > 0) && !actor.system.play.statuses.includes("prone")) await actor.update({ "system.play.statuses": [...actor.system.play.statuses, "prone"] });
  if (raw > 0) await applyOrRequestDamage(actor, { raw, type: packet.type, woundHits: 1, armorPenetration: packet.armorPenetration, armorBonus: packet.armorBonus, conditions: packet.conditions || [], nonlethal: packet.nonlethal, weaponTechEra: packet.weaponTechEra, attackDegree: "Average" });
  else await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<strong>${actor.name}</strong> avoids the ${packet.areaEffect ? "area effect" : "blast"}.` });
  button.disabled = true; button.textContent = raw > 0 ? `Resolved: ${raw} damage` : "Avoided";
}
