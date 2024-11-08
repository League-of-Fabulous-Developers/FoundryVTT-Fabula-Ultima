import { FU, SYSTEM } from './config.mjs';
import { FUHooks } from '../hooks.mjs';
import { Flags } from './flags.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DamageCustomizer } from './damage-customizer.mjs';
import { getSelected, getTargeted } from './target-handler.mjs';

// Typedefs

/**
 * @typedef ClickModifiers
 * @prop {boolean} alt
 * @prop {boolean} ctrl
 * @prop {boolean} shift
 */

/**
 * @callback DamageModifier
 * @param {number} baseDamage
 * @param {ClickModifiers} modifiers
 * @return {number}
 */

/**
 * @typedef BeforeApplyHookData
 * @prop {Event | null} event
 * @prop {FUActor[]} targets
 * @prop {string | null} sourceUuid
 * @prop {string | null} sourceName
 * @prop {import('./typedefs.mjs').BaseDamageInfo} baseDamageInfo
 * @prop {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @prop {ClickModifiers | null} clickModifiers
 */

/**
 * @typedef ApplyTargetHookData
 * @prop {FUActor} target
 * @prop {string | null} sourceUuid
 * @prop {string | null} sourceName
 * @prop {DamageType} damageType
 * @prop {number} total
 * @prop {ClickModifiers | null} clickModifiers
 * @prop {ExtraDamageInfo} extraDamageInfo
 * @prop {ApplyTargetOverrides} overrides
 */

/**
 * @typedef ApplyTargetOverrides
 * @prop {number | null} affinity
 * @prop {number | null} total
 */

function attachDamageApplicationHandler(message, jQuery) {
	const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckParams);
	let sourceUuid = null;
	let sourceName;
	let baseDamageInfo;
	let disabled = false;

	if (check && check.damage) {
		sourceName = check.details.name;
		baseDamageInfo = {
			total: check.damage.total,
			type: check.damage.type,
			modifierTotal: check.damage.modifierTotal,
		};
	}

	if (ChecksV2.isCheck(message)) {
		const damage = CheckConfiguration.inspect(message).getDamage();
		if (damage) {
			sourceUuid = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2)?.itemUuid;
			sourceName = message.getFlag(SYSTEM, Flags.ChatMessage.Item)?.name;
			baseDamageInfo = {
				total: damage.total,
				type: damage.type,
				modifierTotal: damage.modifierTotal,
			};
		}
	}

	const handleClick = async (event, getTargetsFunction) => {
		event.preventDefault();
		if (!disabled) {
			disabled = true;
			const targets = await getTargetsFunction(event);
			if (event.ctrlKey || event.metaKey) {
				DamageCustomizer(
					baseDamageInfo,
					targets,
					(extraDamageInfo) => {
						handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo);
						disabled = false;
					},
					() => {
						disabled = false;
					},
				);
			} else {
				handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, {});
				disabled = false;
			}
		}
	};

	jQuery.find(`a[data-action=applySingleDamage]`).click((event) => handleClick(event, getSingleTarget));
	jQuery.find(`a[data-action=applySelectedDamage]`).click((event) => handleClick(event, getSelected));
	jQuery.find(`a[data-action=applyTargetedDamage]`).click((event) => handleClick(event, getTargeted));
	jQuery.find(`a[data-action=selectDamageCustomizer]`).click(async (event) => {
		if (!disabled) {
			disabled = true;
			const targets = await getTargeted(event);
			DamageCustomizer(
				baseDamageInfo,
				targets,
				(extraDamageInfo) => {
					handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo);
					disabled = false;
				},
				() => {
					disabled = false;
				},
			);
		}
	});
}

/**
 *
 * @param {Event} event
 * @param {FUActor[]} targets
 * @param {string} sourceUuid
 * @param {string} sourceName
 * @param {import('./typedefs.mjs').BaseDamageInfo} baseDamageInfo
 * @param {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @returns {void}
 */
async function handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo) {
	/** @type {ClickModifiers} */
	let clickModifiers = {
		alt: event.altKey,
		ctrl: event.ctrlKey || event.metaKey,
		shift: event.shiftKey,
	};

	/** @type {BeforeApplyHookData} */
	const hookData = {
		event,
		targets,
		sourceUuid,
		sourceName,
		baseDamageInfo,
		extraDamageInfo,
		clickModifiers,
	};

	await applyDamagePipelineWithHook(hookData);
}

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

function getSingleTarget(e) {
	const dataId = $(e.target).closest('a').data('id');
	const actor = fromUuidSync(dataId);
	if (!actor) {
		ui.notifications.warn('FU.ChatApplyEffectNoActorsTargeted', { localize: true });
		return [];
	}
	return [actor];
}

/**
 *
 * @param {FUActor[]} targets
 * @param {string} sourceUuid
 * @param {string} sourceName
 * @param {import('./config.mjs').DamageType} damageType
 * @param {number} total
 * @param {ClickModifiers} clickModifiers
 * @param {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @param {string} chatTemplateName
 * @return {Promise<Awaited<unknown>[]>}
 */
async function applyDamageInternal(targets, sourceUuid, sourceName, damageType, total, clickModifiers, extraDamageInfo, chatTemplateName) {
	if (!Array.isArray(targets)) {
		console.error('Targets is not an array:', targets);
		return;
	}

	const updates = [];
	for (const actor of targets) {
		/** @type {ApplyTargetHookData} */
		const hookData = {
			target: actor,
			sourceUuid,
			sourceName,
			damageType,
			total,
			clickModifiers: Object.assign({}, clickModifiers),
			extraDamageInfo: Object.assign({}, extraDamageInfo),
			overrides: {
				affinity: null,
				total: null,
			},
		};
		Hooks.callAll(FUHooks.DAMAGE_APPLY_TARGET, hookData);

		let affinity = FU.affValue.none; // Default to no affinity
		let affinityIcon = '';
		let affinityString = '';
		if (hookData.overrides?.affinity) {
			affinity = hookData.overrides.affinity;
			affinityIcon = FU.affIcon[hookData.damageType];
		} else if (hookData.damageType in actor.system.affinities) {
			affinity = actor.system.affinities[hookData.damageType].current;
			affinityIcon = FU.affIcon[hookData.damageType];
		}
		affinityString = await renderTemplate('systems/projectfu/templates/chat/partials/inline-damage-icon.hbs', {
			damageType: game.i18n.localize(FU.damageTypes[hookData.damageType]),
			affinityIcon: affinityIcon,
		});

		// Check if affinity should be ignored
		if (affinity === FU.affValue.vulnerability && hookData.extraDamageInfo.ignoreVulnerable) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.resistance && hookData.extraDamageInfo.ignoreResistance) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.immunity && hookData.extraDamageInfo.ignoreImmunities) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.absorption && hookData.extraDamageInfo.ignoreAbsorption) {
			affinity = FU.affValue.none;
		}

		const damageMod = affinityDamageModifier[affinity] ?? affinityDamageModifier[FU.affValue.none];
		const damageTaken = hookData.overrides?.total || -damageMod(hookData.total, hookData.clickModifiers);

		updates.push(actor.modifyTokenAttribute('resources.hp', damageTaken, true));
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: game.i18n.localize(FU.affType[affinity]),
				content: await renderTemplate(chatTemplateName, {
					message: affinityKeys[affinity](hookData.clickModifiers),
					actor: actor.name,
					damage: Math.abs(damageTaken),
					type: affinityString,
					from: hookData.sourceName,
				}),
			}),
		);
	}
	return Promise.all(updates);
}

/**
 *
 * @param {FUActor[]} targets
 * @param {string} sourceUuid
 * @param {string} sourceName
 * @param {import('./config.mjs').DamageType} type
 * @param {number} total
 * @param {ClickModifiers} clickModifiers
 * @param {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @return {Promise<Awaited<unknown>[]>}
 */
export async function applyDamage(targets, sourceUuid, sourceName, type, total, clickModifiers, extraDamageInfo) {
	return await applyDamageInternal(targets, sourceUuid, sourceName, type, total, clickModifiers, extraDamageInfo, 'systems/projectfu/templates/chat/chat-apply-damage.hbs');
}

/**
 *
 * @param {BeforeApplyHookData} hookData
 * @return {Promise<Awaited<unknown>[]>}
 */
export async function applyDamagePipelineWithHook(hookData) {
	Hooks.callAll(FUHooks.DAMAGE_APPLY_BEFORE, hookData);

	const { targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo, clickModifiers } = hookData;

	const modifiedTotal = extraDamageInfo.hrZero
		? extraDamageInfo.damageBonus + baseDamageInfo.modifierTotal + (extraDamageInfo.extraDamage || 0)
		: baseDamageInfo.total + (extraDamageInfo.damageBonus || 0) + (extraDamageInfo.extraDamage || 0);
	const modifiedType = extraDamageInfo.damageType || baseDamageInfo.type;
	const modifiedTargets = extraDamageInfo.targets || targets;

	if (!modifiedTargets) {
		return;
	}

	await applyDamage(modifiedTargets, sourceUuid, sourceName, modifiedType, modifiedTotal, clickModifiers, extraDamageInfo);
}

export function registerChatInteraction() {
	Hooks.on('renderChatMessage', attachDamageApplicationHandler);
}
