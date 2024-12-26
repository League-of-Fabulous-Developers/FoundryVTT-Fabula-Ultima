import { FUHooks } from '../hooks.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Pipeline, PipelineContext, PipelineRequest } from './pipeline.mjs';
import { Flags } from '../helpers/flags.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DamageCustomizer } from './damage-customizer.mjs';
import { getSelected, getTargeted } from '../helpers/target-handler.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';

/**
 * @typedef ApplyTargetOverrides
 * @prop {number | null} affinity
 * @prop {number | null} total
 */

/**
 * @property {BaseDamageInfo} baseDamageInfo
 * @property {ExtraDamageInfo} extraDamageInfo
 * @property {FU.damageTypes} damageType
 * @property {ApplyTargetOverrides} overrides
 * @extends PipelineRequest
 */
export class DamageRequest extends PipelineRequest {
	constructor(sourceInfo, targets, baseDamageInfo, extraDamageInfo = null) {
		super(sourceInfo, targets);
		this.baseDamageInfo = baseDamageInfo;
		this.extraDamageInfo = extraDamageInfo || {};
		this.damageType = this.extraDamageInfo.damageType || this.baseDamageInfo.type;
		this.overrides = {};
	}

	/**
	 * @returns {FUActor[]}
	 */
	get allTargets() {
		return this.extraDamageInfo.targets || this.targets;
	}

	/**
	 * @returns {boolean} Whether the request is in a valid state
	 */
	validate() {
		if (!this.allTargets) {
			console.error(`No targets assigned to request`);
			return;
		}

		if (!Array.isArray(this.targets)) {
			console.error('Targets is not an array:', this.targets);
			return false;
		}

		return true;
	}
}

/**
 * @callback DamageModifier
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
 * @type {string} The name of the event
 */
const eventName = 'processDamage';

/**
 * @type PipelineStep
 */
function resolveAffinity(context) {
	let affinity = FU.affValue.none; // Default to no affinity
	let affinityIcon = '';

	if (context.overrides?.affinity) {
		affinity = context.overrides.affinity;
		affinityIcon = FU.affIcon[context.damageType];
	} else if (context.damageType in context.actor.system.affinities) {
		affinity = context.actor.system.affinities[context.damageType].current;
		affinityIcon = FU.affIcon[context.damageType];
	}

	// Check if affinity should be ignored
	if (affinity === FU.affValue.vulnerability && context.extraDamageInfo.ignoreVulnerable) {
		affinity = FU.affValue.none;
	}
	if (affinity === FU.affValue.resistance && context.extraDamageInfo.ignoreResistance) {
		affinity = FU.affValue.none;
	}
	if (affinity === FU.affValue.immunity && context.extraDamageInfo.ignoreImmunities) {
		affinity = FU.affValue.none;
	}
	if (affinity === FU.affValue.absorption && context.extraDamageInfo.ignoreAbsorption) {
		affinity = FU.affValue.none;
	}

	context.affinity = affinity;
	context.affinityIcon = affinityIcon;

	return true;
}

/**
 * @param {PipelineContext} context
 * @type PipelineStep
 */
function calculateAmount(context) {
	let amount = context.extraDamageInfo.hrZero
		? context.extraDamageInfo.damageBonus + context.baseDamageInfo.modifierTotal + (context.extraDamageInfo.extraDamage || 0)
		: context.baseDamageInfo.total + (context.extraDamageInfo.damageBonus || 0) + (context.extraDamageInfo.extraDamage || 0);

	// Source
	if (context.sourceActor) {
		const outgoing = context.sourceActor.system.bonuses.damage;
		amount += outgoing.all;
		amount += outgoing[context.damageType];
	}

	// Target
	const incoming = context.actor.system.bonuses.incomingDamage;
	amount += incoming.all;
	amount += incoming[context.damageType];

	context.amount = amount;
}

/**
 * @type PipelineStep
 */
function calculateDamageFromAffinity(context) {
	const calculateDamage = affinityDamageModifier[context.affinity] ?? affinityDamageModifier[FU.affValue.none];
	context.result = -calculateDamage(context.amount, context.clickModifiers);
	return true;
}

/**
 * @type PipelineStep
 */
function useDamageFromOverride(context) {
	if (context.overrides?.total) {
		context.result = context.overrides.total;
		return false;
	}
	return true;
}

/**
 * @param {DamageRequest} request
 * @return {Promise<Awaited<unknown>[]>}
 */
async function applyDamageInternal(request) {
	if (!request.validate()) {
		return;
	}

	const updates = [];
	for (const actor of request.targets) {
		// Create an initial context then run the pipeline (invoke all the callback steps)
		let context = new PipelineContext(request, actor);
		Hooks.call(eventName, context);
		if (context.result === undefined) {
			throw new Error('Failed to generate result during pipeline');
		}

		// Damage application
		const damageTaken = context.result;
		updates.push(actor.modifyTokenAttribute('resources.hp', damageTaken, true));
		// Chat message
		const affinityString = await renderTemplate('systems/projectfu/templates/chat/partials/inline-damage-icon.hbs', {
			damageType: game.i18n.localize(FU.damageTypes[request.damageType]),
			affinityIcon: context.affinityIcon,
		});
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: game.i18n.localize(FU.affType[context.affinity]),
				content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-damage.hbs', {
					message: affinityKeys[context.affinity](request.clickModifiers),
					actor: actor.name,
					damage: Math.abs(damageTaken),
					type: affinityString,
					from: request.sourceInfo.name,
				}),
			}),
		);
	}
	return Promise.all(updates);
}

/**
 * @param {DamageRequest} request
 * @return {Promise<Awaited<unknown>[]>}
 */
async function process(request) {
	// TODO: Remove with the newer hooks?
	Hooks.callAll(FUHooks.DAMAGE_APPLY_BEFORE, request);
	Hooks.callAll(FUHooks.DAMAGE_APPLY_TARGET, request);
	await applyDamageInternal(request);
}

/**
 * @param {?} message
 * @param {jQuery} jQuery
 */
function onRenderChatMessage(message, jQuery) {
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

	jQuery.find(`a[data-action=applySingleDamage]`).click((event) => handleClick(event, Pipeline.getSingleTarget));
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
 * Registers the default steps used by the pipeline
 */
function registerDefaultSteps() {
	Hooks.on(eventName, resolveAffinity);
	Hooks.on(eventName, calculateAmount);
	Hooks.on(eventName, calculateDamageFromAffinity);
	Hooks.on(eventName, useDamageFromOverride);
}

/**
 *
 * @param {Event} event
 * @param {FUActor[]} targets
 * @param {string} sourceUuid
 * @param {string} sourceName
 * @param {import('../helpers/typedefs.mjs').BaseDamageInfo} baseDamageInfo
 * @param {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @returns {void}
 */
async function handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo) {
	const sourceInfo = new InlineSourceInfo(sourceName, sourceUuid, null);
	const request = new DamageRequest(sourceInfo, targets, baseDamageInfo, extraDamageInfo);
	request.setEvent(event);
	await DamagePipeline.process(request);
}

export const DamagePipeline = {
	eventName: eventName,
	process,
	registerDefaultSteps,
	onRenderChatMessage,
};
