import { FU } from './config.mjs';
import { SYSTEM } from '../settings.js';
import { Flags } from './flags.mjs';

export function registerChatInteraction() {
	Hooks.on('renderChatMessage', attachDamageApplicationHandler);
}

/**
 * @param {ChatMessage} message
 * @param {jQuery} jQuery
 */
function attachDamageApplicationHandler(message, jQuery) {
	/**
	 * @type CheckParameters
	 */
	const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckParams);
	if (check && check.damage) {
		let disabled = false;
		jQuery.find(`a[data-action=applyDamage]`).click(async function (event) {
			if (!disabled) {
				disabled = true;
				await handleDamageApplication(check, message, {
					alt: event.altKey,
					ctrl: event.ctrlKey || event.metaKey,
					shift: event.shiftKey,
				});
				disabled = false;
			}
		});
	}
}

/**
 * @typedef ClickModifiers
 * @param {boolean} alt
 * @param {boolean} ctrl
 * @param {boolean} shift
 */
/**
 * @typedef DamageModifier
 * @function
 * @param {number} baseDamage
 * @param {ClickModifiers} modifiers
 * @return {number}
 */

/**
 * @type {Record<number, DamageModifier>}
 */
const affinityDamageModifier = {
	[FU.affValue.vulnerability]: (damage) => damage * 2,
	[FU.affValue.none]: (damage) => damage,
	[FU.affValue.resistance]: (damage, { shift }) => (shift ? damage : Math.floor(damage / 2)),
	[FU.affValue.immunity]: (damage, { shift, ctrl }) => (shift && ctrl ? damage : 0),
	[FU.affValue.absorption]: (damage) => -damage,
};

const affinityKeys = {
	[FU.affValue.vulnerability]: () => 'FU.ChatApplyDamageVulnerable',
	[FU.affValue.none]: () => 'FU.ChatApplyDamageNormal',
	[FU.affValue.resistance]: ({ shift }) => (shift ? 'FU.ChatApplyDamageResistantIgnored' : 'FU.ChatApplyDamageResistant'),
	[FU.affValue.immunity]: ({ shift, ctrl }) => (shift && ctrl ? 'FU.ChatApplyDamageImmuneIgnored' : 'FU.ChatApplyDamageImmune'),
	[FU.affValue.absorption]: () => 'FU.ChatApplyDamageAbsorb',
};

/**
 *
 * @param {FUActor[]} targets
 * @param {DamageType} damageType
 * @param {number} total
 * @param {ClickModifiers} modifiers
 * @param {string} sourceName
 * @return {Promise<Awaited<unknown>[]>}
 */
export async function applyDamage(targets, damageType, total, modifiers, sourceName) {
	const updates = [];
	for (const actor of targets) {
		let affinity = FU.affValue.none; // Default to no affinity
		let affinityIcon = '';
		let affinityString = '';
		if (damageType in actor.system.affinities) {
			affinity = actor.system.affinities[damageType].current;
			affinityIcon = FU.affIcon[damageType];
		}
		affinityString = await renderTemplate('systems/projectfu/templates/chat/partials/inline-damage-icon.hbs', {
			damageType: game.i18n.localize(FU.damageTypes[damageType]),
			affinityIcon: affinityIcon,
		});

		const damageMod = affinityDamageModifier[affinity] ?? affinityDamageModifier[FU.affValue.none];
		const damageTaken = -damageMod(total, modifiers);
		updates.push(actor.modifyTokenAttribute('resources.hp', damageTaken, true));
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: game.i18n.localize(FU.affType[affinity]),
				content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-damage.hbs', {
					message: affinityKeys[affinity](modifiers),
					actor: actor.name,
					damage: Math.abs(damageTaken),
					type: affinityString,
					from: sourceName,
				}),
			}),
		);
	}
	return Promise.all(updates);
}

/**
 * @param {CheckParameters} check
 * @param {ChatMessage} message
 * @param {ClickModifiers} modifiers
 * @return {Promise}
 */
async function handleDamageApplication(check, message, modifiers) {
	const targets = canvas.tokens.controlled.map((value) => value.document.actor).filter((value) => value);
	if (!targets.length) {
		if (game.user.character) {
			targets.push(game.user.character);
		} else {
			ui.notifications.error('FU.ChatApplyDamageNoActorsSelected', { localize: true });
			return;
		}
	}
	const { total = 0, type: damageType } = check.damage;
	return applyDamage(targets, damageType, total, modifiers, check.details.name);
}
