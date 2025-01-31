import { FUHooks } from '../hooks.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Pipeline, PipelineContext, PipelineRequest } from './pipeline.mjs';
import { Flags } from '../helpers/flags.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DamageCustomizer } from './damage-customizer.mjs';
import { getSelected, getTargeted } from '../helpers/target-handler.mjs';
import { InlineHelper, InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { ApplyTargetHookData, BeforeApplyHookData } from './legacy-hook-data.mjs';
import { ResourcePipeline, ResourceRequest } from './resource-pipeline.mjs';

/**
 * @typedef ApplyTargetOverrides
 * @prop {number | null} affinity
 * @prop {number | null} total
 */

/**
 * @property {BaseDamageInfo} baseDamageInfo
 * @property {ExtraDamageInfo} extraDamageInfo
 * @property {FU.damageTypes} damageType
 * @property {ApplyTargetOverrides} overrides *
 * @extends PipelineRequest
 */
export class DamageRequest extends PipelineRequest {
	constructor(sourceInfo, targets, baseDamageInfo, extraDamageInfo = {}) {
		super(sourceInfo, targets);
		this.baseDamageInfo = baseDamageInfo;
		this.extraDamageInfo = extraDamageInfo;
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
 * @typedef DamageBreakdown
 * @property {String} step
 * @property {String} effect
 * @property {String} total
 */

// TODO: Decide whether to define in config.mjs. Though it's probably fine if they are all in english
const Traits = {
	IgnoreResistance: 'ignore-resistance',
	IgnoreImmunity: 'ignore-immunity',
};

/**
 * @property {Number} affinity The index of the affinity
 * @property {String} affinityMessage The localized affinity message to use
 * @property {FU.damageTypes} damageType
 * @property {Number} amount The base amount before bonuses or modifiers are applied
 * @property {Map<String, Number>} bonuses Increments
 * @property {Map<String, Number>} modifiers Multipliers
 * @property {DamageBreakdown[]} breakdown
 * @extends PipelineContext
 */
export class DamagePipelineContext extends PipelineContext {
	constructor(request, actor) {
		super(request, actor);
		this.bonuses = new Map();
		this.modifiers = new Map();
		this.breakdown = [];
		this.calculateAmount();
	}

	calculateAmount() {
		this.amount = this.extraDamageInfo.hrZero
			? this.extraDamageInfo.damageBonus + this.baseDamageInfo.modifierTotal + (this.extraDamageInfo.extraDamage || 0)
			: this.baseDamageInfo.total + (this.extraDamageInfo.damageBonus || 0) + (this.extraDamageInfo.extraDamage || 0);
	}

	addBonus(key, value) {
		if (value !== 0) {
			this.bonuses.set(key, value);
			return true;
		}
		return false;
	}

	addModifier(key, value) {
		if (value !== 1) {
			this.modifiers.set(key, value);
			return true;
		}
		return false;
	}

	/**
	 * @param {String} step
	 * @param {String} effect
	 * @param {Number} total
	 */
	recordStep(step, effect, total) {
		this.breakdown.push({
			step: InlineHelper.nicifyString(step),
			effect: effect,
			total: total,
		});
	}
}

// TODO: Provide variant option to modify resistance/vulnerability scaling
/**
 * @type {Record<Number, Number>}
 * @description Index : Multiplier
 */
const affinityDamageModifier = {
	[FU.affValue.vulnerability]: 2,
	[FU.affValue.none]: 1,
	[FU.affValue.resistance]: 0.5,
	[FU.affValue.immunity]: 0,
	[FU.affValue.absorption]: -1,
};

/**
 * @param {DamagePipelineContext} context
 * @return {Boolean}
 */
function resolveAffinity(context) {
	// Default to no affinity
	let affinity = FU.affValue.none;
	let affinityMessage = 'FU.ChatApplyDamageNormal';

	if (context.overrides?.affinity) {
		affinity = context.overrides.affinity;
	} else if (context.damageType in context.actor.system.affinities) {
		affinity = context.actor.system.affinities[context.damageType].current;
	}

	// Check if affinity should be ignored
	if (affinity === FU.affValue.vulnerability) {
		affinityMessage = 'FU.ChatApplyDamageVulnerable';
		if (context.extraDamageInfo.ignoreVulnerable) {
			affinity = FU.affValue.none;
		}
	}
	if (affinity === FU.affValue.resistance) {
		if (context.extraDamageInfo.ignoreResistance || context.traits.has(Traits.IgnoreResistance)) {
			affinity = FU.affValue.none;
			affinityMessage = 'FU.ChatApplyDamageResistantIgnored';
		} else {
			affinityMessage = `FU.ChatApplyDamageResistant`;
		}
	}
	if (affinity === FU.affValue.immunity) {
		if (context.extraDamageInfo.ignoreImmunities || context.traits.has(Traits.IgnoreImmunity)) {
			affinity = FU.affValue.none;
			affinityMessage = `FU.ChatApplyDamageImmuneIgnored`;
		} else {
			affinityMessage = `FU.ChatApplyDamageImmune`;
		}
	}
	if (affinity === FU.affValue.absorption) {
		if (context.extraDamageInfo.ignoreAbsorption) {
			affinity = FU.affValue.none;
		} else {
			affinityMessage = 'FU.ChatApplyDamageAbsorb';
		}
	}

	context.affinityMessage = affinityMessage;
	context.affinity = affinity;
	return true;
}

/**
 * @param {DamagePipelineContext} context
 * @return {Boolean} True if the result was overridden
 */
function overrideResult(context) {
	if (context.overrides?.total) {
		context.result = context.overrides.total;
		return true;
	}
	return false;
}

/**
 * @param {DamagePipelineContext} context
 * @return {Boolean}
 */
function collectIncrements(context) {
	// Source
	if (context.sourceActor) {
		if (context.sourceActor.system.bonuses) {
			const outgoing = context.sourceActor.system.bonuses.damage;
			context.addBonus('outgoingDamage.all', outgoing.all);
			context.addBonus(`outgoingDamage.${context.damageType}`, outgoing[context.damageType] ?? 0);
		}
	}

	// Target
	if (context.actor.system.bonuses) {
		const incoming = context.actor.system.bonuses.incomingDamage;
		context.addBonus(`incomingDamage.all`, incoming.all);
		context.addBonus(`incomingDamage.${context.damageType}`, incoming[context.damageType] ?? 0);
	}
}

/**
 * @param {DamagePipelineContext} context
 * @return {Boolean}
 * @remarks These flags can be set on an active effect with the key: `flags.projectfu.<SKILL>`, change mode: `Override`, effect value: `true`.
 */
function collectMultipliers(context) {
	const target = context.actor;

	// Custom Modifiers
	const scaleIncomingDamage = target.getFlag(Flags.Scope, Flags.Modifier.ScaleIncomingDamage);
	if (scaleIncomingDamage) {
		context.addModifier('scaleIncomingDamage', scaleIncomingDamage);
	}

	context.addModifier('affinity', affinityDamageModifier[context.affinity]);
}

/**
 * @description
 * @param {DamagePipelineContext} context
 * @return {Boolean}
 */
function calculateResult(context) {
	// We invoke the hook here since the increment order doesn't matter; multipliers shouldn't matter outside of affinity going last.
	Hooks.call(FUHooks.DAMAGE_PIPELINE_PRE_CALCULATE, context);

	let result = context.amount;

	/** @type DamageBreakdown[] */
	context.recordStep('initial', '', context.amount);

	// Increments (+-)
	for (const [key, value] of context.bonuses) {
		result += value;
		context.recordStep(key, value > 0 ? `+${value}` : value, result);
	}
	// Multipliers (*)
	for (const [key, value] of context.modifiers) {
		result *= value;
		context.recordStep(key, `*${value}`, result);
	}

	context.result = result;
	Hooks.call(FUHooks.DAMAGE_PIPELINE_POST_CALCULATE, context);
	return true;
}

/**
 * @param {DamageRequest} request
 * @return {Promise<Awaited<unknown>[]>}
 */
async function process(request) {
	if (!request.validate()) {
		return Promise.reject('Request was not valid');
	}

	// TODO: Remove once users have migrated from legacy hooks
	const beforeApplyHookData = new BeforeApplyHookData(request);
	Hooks.call(FUHooks.DAMAGE_APPLY_BEFORE, beforeApplyHookData);
	request.baseDamageInfo = beforeApplyHookData.baseDamageInfo;
	request.extraDamageInfo = beforeApplyHookData.extraDamageInfo;

	const updates = [];
	for (const actor of request.targets) {
		// Create an initial context then run the pipeline
		let context = new DamagePipelineContext(request, actor);

		resolveAffinity(context);
		if (!overrideResult(context)) {
			collectIncrements(context);
			collectMultipliers(context);
			calculateResult(context);
		}
		if (context.result === undefined) {
			throw new Error('Failed to generate result during pipeline');
		}

		// TODO: Remove once users have migrated from legacy hooks
		const applyTargetHookData = new ApplyTargetHookData(request, actor, context.result);
		Hooks.call(FUHooks.DAMAGE_APPLY_TARGET, applyTargetHookData);
		context.result = applyTargetHookData.total;

		// Damage application
		const damageTaken = -context.result;
		updates.push(actor.modifyTokenAttribute('resources.hp', damageTaken, true));
		actor.showFloatyText(`${damageTaken} HP`, `red`);
		// Chat message
		const affinityString = await renderTemplate('systems/projectfu/templates/chat/partials/inline-damage-icon.hbs', {
			damage: Math.abs(damageTaken),
			damageType: game.i18n.localize(FU.damageTypes[request.damageType]),
			affinityIcon: FU.affIcon[context.damageType],
		});
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: game.i18n.localize(FU.affType[context.affinity]),
				content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-damage.hbs', {
					message: context.affinityMessage,
					actor: actor.name,
					uuid: actor.uuid,
					damage: Math.abs(damageTaken),
					type: affinityString,
					from: request.sourceInfo.name,
					sourceActorUuid: request.sourceInfo.actorUuid,
					sourceItemUuid: request.sourceInfo.itemUuid,
					breakdown: context.breakdown,
				}),
			}),
		);
	}
	return Promise.all(updates);
}

// TODO: Move elsewhere
/**
 * @param {Document} message
 * @param {jQuery} jQuery
 */
function onRenderChatMessage(message, jQuery) {
	const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckParams);
	let sourceItemUuid = null;
	let sourceActorUuid = null;
	let sourceName;
	let baseDamageInfo;
	let disabled = false;
	/** @type InlineSourceInfo **/
	let sourceInfo = null;

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
			sourceActorUuid = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2)?.actorUuid;
			sourceItemUuid = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2)?.itemUuid;
			sourceName = message.getFlag(SYSTEM, Flags.ChatMessage.Item)?.name;
			sourceInfo = new InlineSourceInfo(sourceName, sourceActorUuid, sourceItemUuid);
			baseDamageInfo = {
				total: damage.total,
				type: damage.type,
				modifierTotal: damage.modifierTotal,
			};
		}
	}

	const customizeDamage = async (event, targets) => {
		DamageCustomizer(
			baseDamageInfo,
			targets,
			async (extraDamageInfo) => {
				await handleDamageApplication(event, targets, sourceInfo, baseDamageInfo, extraDamageInfo);
				disabled = false;
			},
			() => {
				disabled = false;
			},
		);
	};

	const applyDefaultDamage = async (event, targets) => {
		return handleDamageApplication(event, targets, sourceInfo, baseDamageInfo, {});
	};

	const handleClick = async (event, getTargetsFunction, action, alternateAction) => {
		event.preventDefault();
		if (!disabled) {
			disabled = true;
			const targets = await getTargetsFunction(event);
			if (event.ctrlKey || event.metaKey) {
				await alternateAction(event, targets);
				disabled = false;
			} else {
				await action(event, targets);
				disabled = false;
			}
		}
	};

	jQuery.find(`a[data-action=applyDamage]`).click((event) => handleClick(event, Pipeline.getSingleTarget, applyDefaultDamage, customizeDamage));
	jQuery.find(`a[data-action=applyDamageSelected]`).click((event) => handleClick(event, getSelected, applyDefaultDamage, customizeDamage));

	jQuery.find(`a[data-action=selectDamageCustomizer]`).click(async (event) => {
		if (!disabled) {
			disabled = true;
			const targets = await getTargeted();
			DamageCustomizer(
				baseDamageInfo,
				targets,
				(extraDamageInfo) => {
					handleDamageApplication(event, targets, sourceInfo, baseDamageInfo, extraDamageInfo);
					disabled = false;
				},
				() => {
					disabled = false;
				},
			);
		}
	});

	Pipeline.handleClickRevert(message, jQuery, 'revertDamage', async (dataset) => {
		const uuid = dataset.uuid;
		const actor = fromUuidSync(uuid);
		const updates = [];
		const amountRecovered = dataset.amount;
		updates.push(actor.modifyTokenAttribute('resources.hp', amountRecovered, true));
		actor.showFloatyText(`${amountRecovered} HP`, `lightgreen`);
		return Promise.all(updates);
	});

	jQuery.find(`a[data-action=toggleBreakdown]`).click(function (event) {
		event.preventDefault();
		jQuery.find('#breakdown').toggleClass('hidden');
	});

	jQuery.find(`a[data-action=absorbDamage]`).click(async function (event) {
		event.preventDefault();
		const amount = Number.parseInt(this.dataset.amount) * 0.5;
		const resource = this.dataset.resource;

		const actorUuid = this.dataset.uuid;
		const itemUuid = this.dataset.itemUuid;

		const sourceInfo = InlineSourceInfo.resolveName(actorUuid, itemUuid);
		const targets = [sourceInfo.resolveActor()];
		const request = new ResourceRequest(sourceInfo, targets, resource, amount, false);
		ResourcePipeline.processRecovery(request);
	});
}

/**
 *
 * @param {Event} event
 * @param {FUActor[]} targets
 * @param {InlineSourceInfo} sourceInfo
 * @param {import('../helpers/typedefs.mjs').BaseDamageInfo} baseDamageInfo
 * @param {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @returns {void}
 */
async function handleDamageApplication(event, targets, sourceInfo, baseDamageInfo, extraDamageInfo) {
	const request = new DamageRequest(sourceInfo, targets, baseDamageInfo, extraDamageInfo);
	request.event = event;
	if (event.shiftKey) {
		request.traits.add(Traits.IgnoreResistance);
		if (event.ctrlKey || event.metaKey) {
			request.traits.add(Traits.IgnoreImmunity);
		}
	}
	await DamagePipeline.process(request);
}

export const DamagePipeline = {
	process,
	onRenderChatMessage,
};
