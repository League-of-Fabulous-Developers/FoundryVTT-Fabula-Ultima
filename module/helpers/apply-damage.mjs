import { FU, SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DamageCustomizer } from './damage-customizer.mjs';
import { getSelected, getTargeted } from './target-handler.mjs';

export function registerChatInteraction() {
	Hooks.on('renderChatMessage', attachDamageApplicationHandler);
}

function attachDamageApplicationHandler(message, jQuery) {
	const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckParams);
	if (check && check.damage) {
		let disabled = false;
		const handleDamageApplication = async (event, targets, extraDamageInfo) => {
			if (targets) {
				const { total = 0, type: damageType, modifierTotal: modTotal } = check.damage;
				// const modifiedTotal = total + (extraDamageInfo.damageBonus || 0);
				const modifiedTotal = extraDamageInfo.hrZero ? extraDamageInfo.damageBonus + modTotal : total + (extraDamageInfo.damageBonus || 0);
				const modifiedType = extraDamageInfo.damageType || damageType;
				await applyDamage(
					targets,
					modifiedType,
					modifiedTotal,
					{
						alt: event.altKey,
						ctrl: event.ctrlKey || event.metaKey,
						shift: event.shiftKey,
					},
					check.details.name,
					extraDamageInfo,
				);

				if (extraDamageInfo.extraDamage > 0) {
					await applyExtraDamage(
						targets,
						extraDamageInfo.extraDamageType,
						extraDamageInfo.extraDamage,
						{
							alt: event.altKey,
							ctrl: event.ctrlKey || event.metaKey,
							shift: event.shiftKey,
						},
						check.details.name,
						extraDamageInfo,
					);
				}
			}
			disabled = false;
		};

		const handleClick = async (event, getTargetsFunction) => {
			if (!disabled) {
				disabled = true;
				const targets = await getTargetsFunction(event);
				if (event.ctrlKey || event.metaKey) {
					DamageCustomizer(
						check.damage,
						targets,
						(extraDamageInfo) => handleDamageApplication(event, targets, extraDamageInfo),
						() => {
							disabled = false;
						},
					);
				} else {
					handleDamageApplication(event, targets, {});
				}
			}
		};

		jQuery.find(`a[data-action=applySingleDamage]`).click((event) => handleClick(event, getSingleTarget));
		jQuery.find(`a[data-action=applySelectedDamage]`).click((event) => handleClick(event, getSelected));
		jQuery.find(`a[data-action=applyTargetedDamage]`).click((event) => handleClick(event, getTargeted));
	}

	if (ChecksV2.isCheck(message)) {
		const damage = CheckConfiguration.inspect(message).getDamage();
		if (damage) {
			let disabled = false;
			const handleDamageApplication = async (event, targets, extraDamageInfo) => {
				if (targets) {
					// const modifiedTotal = damage.total + (extraDamageInfo.damageBonus || 0); // Add the damage bonus to the total damage
					const modifiedTotal = extraDamageInfo.hrZero ? extraDamageInfo.damageBonus + damage.modifierTotal : damage.total + (extraDamageInfo.damageBonus || 0);
					const modifiedType = extraDamageInfo.damageType || damage.type;
					await applyDamage(
						targets,
						modifiedType,
						modifiedTotal,
						{
							alt: event.altKey,
							ctrl: event.ctrlKey || event.metaKey,
							shift: event.shiftKey,
						},
						message.getFlag(SYSTEM, Flags.ChatMessage.Item)?.name,
						extraDamageInfo,
					);
					if (extraDamageInfo.extraDamage > 0) {
						await applyExtraDamage(
							targets,
							extraDamageInfo.extraDamageType,
							extraDamageInfo.extraDamage,
							{
								alt: event.altKey,
								ctrl: event.ctrlKey || event.metaKey,
								shift: event.shiftKey,
							},
							message.getFlag(SYSTEM, Flags.ChatMessage.Item)?.name,
							extraDamageInfo,
						);
					}
				}
				disabled = false;
			};

			const handleClick = async (event, getTargetsFunction) => {
				if (!disabled) {
					disabled = true;
					const targets = await getTargetsFunction(event);
					if (event.ctrlKey || event.metaKey) {
						DamageCustomizer(
							damage,
							targets,
							(extraDamageInfo) => handleDamageApplication(event, targets, extraDamageInfo),
							() => {
								disabled = false;
							},
						);
					} else {
						handleDamageApplication(event, targets, {});
					}
				}
			};

			jQuery.find(`a[data-action=applySingleDamage]`).click((event) => handleClick(event, getSingleTarget));
			jQuery.find(`a[data-action=applySelectedDamage]`).click((event) => handleClick(event, getSelected));
			jQuery.find(`a[data-action=applyTargetedDamage]`).click((event) => handleClick(event, getTargeted));
		}
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
export async function applyDamage(targets, damageType, total, modifiers, sourceName, extraDamageInfo) {
	if (!Array.isArray(targets)) {
		console.error('Targets is not an array:', targets);
		return;
	}
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

		// Check if affinity should be ignored
		if (affinity === FU.affValue.vulnerability && extraDamageInfo.ignoreVulnerable) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.resistance && extraDamageInfo.ignoreResistance) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.immunity && extraDamageInfo.ignoreImmunities) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.absorption && extraDamageInfo.ignoreAbsorption) {
			affinity = FU.affValue.none;
		}

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
export async function applyExtraDamage(targets, damageType, total, modifiers, sourceName, extraDamageInfo) {
	if (!Array.isArray(targets)) {
		console.error('Targets is not an array:', targets);
		return;
	}
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

		// Check if affinity should be ignored
		if (affinity === FU.affValue.vulnerability && extraDamageInfo.ignoreVulnerable) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.resistance && extraDamageInfo.ignoreResistance) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.immunity && extraDamageInfo.ignoreImmunities) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.absorption && extraDamageInfo.ignoreAbsorption) {
			affinity = FU.affValue.none;
		}

		const damageMod = affinityDamageModifier[affinity] ?? affinityDamageModifier[FU.affValue.none];
		const damageTaken = -damageMod(total, modifiers);
		updates.push(actor.modifyTokenAttribute('resources.hp', damageTaken, true));
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: game.i18n.localize(FU.affType[affinity]),
				content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-extra-damage.hbs', {
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

function getSingleTarget() {
	// Implement logic to return the single selected target, if any
	// For now, just return an empty array as a placeholder
	return [];
}
