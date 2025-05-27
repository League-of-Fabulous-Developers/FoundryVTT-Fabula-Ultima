import { FUHooks } from '../hooks.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Pipeline, PipelineContext, PipelineRequest } from './pipeline.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DamageCustomizer } from './damage-customizer.mjs';
import { getSelected, getTargeted } from '../helpers/target-handler.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { ResourcePipeline, ResourceRequest } from './resource-pipeline.mjs';
import { ChatMessageHelper } from '../helpers/chat-message-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { Traits } from './traits.mjs';
import { CommonEvents } from '../checks/common-events.mjs';
import { TokenUtils } from '../helpers/token-utils.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { CheckRetarget } from '../checks/check-retarget.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';

/**
 * @typedef {"incomingDamage.all", "incomingDamage.air", "incomingDamage.bolt", "incomingDamage.dark", "incomingDamage.earth", "incomingDamage.fire", "incomingDamage.ice", "incomingDamage.light", "incomingDamage.poison"} DamagePipelineStepIncomingDamage
 */

/**
 * @typedef {"initial", "scaleIncomingDamage", "affinity", DamagePipelineStepIncomingDamage} DamagePipelineStep
 */

const PIPELINE_STEP_LOCALIZATION_KEYS = {
	initial: 'FU.DamagePipelineStepInitial',
	extra: 'FU.Extra',
	scaleIncomingDamage: 'FU.DamagePipelineStepScaleIncomingDamage',
	affinity: 'FU.DamagePipelineStepAffinity',
	incomingDamage: {
		all: 'FU.DamagePipelineStepIncomingDamageAll',
		physical: 'FU.DamagePipelineStepIncomingDamagePhysical',
		air: 'FU.DamagePipelineStepIncomingDamageAir',
		bolt: 'FU.DamagePipelineStepIncomingDamageBolt',
		dark: 'FU.DamagePipelineStepIncomingDamageDark',
		earth: 'FU.DamagePipelineStepIncomingDamageEarth',
		fire: 'FU.DamagePipelineStepIncomingDamageFire',
		ice: 'FU.DamagePipelineStepIncomingDamageIce',
		light: 'FU.DamagePipelineStepIncomingDamageLight',
		poison: 'FU.DamagePipelineStepIncomingDamagePoison',

		beast: `FU.Beast`,
		construct: 'FU.Construct',
		demon: 'FU.Demon',
		elemental: 'FU.Elemental',
		humanoid: 'FU.Humanoid',
		monster: 'FU.Monster',
		plant: 'FU.Plant',
		undead: 'FU.Undead',
	},
	// TODO: Better way to not duplicate?
	damage: {
		beast: `FU.Beast`,
		construct: 'FU.Construct',
		demon: 'FU.Demon',
		elemental: 'FU.Elemental',
		humanoid: 'FU.Humanoid',
		monster: 'FU.Monster',
		plant: 'FU.Plant',
		undead: 'FU.Undead',
	},
};

/**
 * @typedef ApplyTargetOverrides
 * @prop {number | null} affinity
 * @prop {number | null} total
 */

/**
 * @property {DamageData} damageData
 * @property {FU.damageTypes} damageType
 * @property {DamageOverrideInfo} damageOverride
 * @property {ApplyTargetOverrides} overrides *
 * @extends PipelineRequest
 */
export class DamageRequest extends PipelineRequest {
	constructor(sourceInfo, targets, damageData, damageOverride = {}) {
		super(sourceInfo, targets);
		this.damageData = damageData;
		this.damageOverride = damageOverride;
		this.damageType = this.damageOverride.damageType || this.damageData.type;
		this.overrides = {};
	}

	/**
	 * @returns {FUActor[]}
	 */
	get allTargets() {
		return this.damageOverride.targets || this.targets;
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

/**
 * @property {Number} affinity The index of the affinity
 * @property {String} affinityMessage The localized affinity message to use
 * @property {FU.damageTypes} damageType
 * @property {DamageData} damageData
 * @property {DamageOverrideInfo} damageOverride
 * @property {String} extra An optional expression to evaluate for onApply damage
 * @property {Number} amount The base amount before bonuses or modifiers are applied
 * @property {Map<String, Number>} bonuses Increments
 * @property {Map<String, Number>} modifiers Multipliers
 * @property {DamageBreakdown[]} breakdown
 * @extends PipelineContext
 */
export class DamagePipelineContext extends PipelineContext {
	/**
	 * @param {DamageRequest} request
	 * @param {FUActor} actor
	 */
	constructor(request, actor) {
		super(request, actor);
		this.bonuses = new Map();
		this.modifiers = new Map();
		this.breakdown = [];
		this.extra = request.damageData.extra;
		this.calculateAmount();
	}

	calculateAmount() {
		let result = this.damageOverride.hrZero ? this.damageData.modifierTotal : this.damageData.total;
		result += this.damageOverride.extraDamage || 0;
		this.amount = result;
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
	 * @param {DamagePipelineStep} step
	 * @param {String} effect
	 * @param {Number} total
	 */
	recordStep(step, effect, total) {
		this.breakdown.push({
			step: this.#localizeStep(step),
			effect: effect,
			total: total,
		});
	}

	#localizeStep(step) {
		return foundry.utils.getProperty(PIPELINE_STEP_LOCALIZATION_KEYS, step) ?? step;
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

	// Special case (break early)
	if (context.traits.has(Traits.MindPointLoss)) {
		context.affinityMessage = 'FU.ChatResourceLoss';
		context.affinity = affinity;
		return true;
	}
	if (context.overrides?.affinity) {
		affinity = context.overrides.affinity;
	} else if (context.damageType in context.actor.system.affinities) {
		affinity = context.actor.system.affinities[context.damageType].current;
	}

	// Check if affinity should be ignored
	if (affinity === FU.affValue.vulnerability) {
		affinityMessage = 'FU.ChatApplyDamageVulnerable';
		if (context.damageOverride.ignoreVulnerable) {
			affinity = FU.affValue.none;
		}
	}
	if (affinity === FU.affValue.resistance) {
		if (context.damageOverride.ignoreResistance || context.traits.has(Traits.IgnoreResistances)) {
			affinity = FU.affValue.none;
			affinityMessage = 'FU.ChatApplyDamageResistantIgnored';
		} else {
			affinityMessage = `FU.ChatApplyDamageResistant`;
		}
	}
	if (affinity === FU.affValue.immunity) {
		if (context.damageOverride.ignoreImmunities || context.traits.has(Traits.IgnoreImmunities)) {
			affinity = FU.affValue.none;
			affinityMessage = `FU.ChatApplyDamageImmuneIgnored`;
		} else {
			affinityMessage = `FU.ChatApplyDamageImmune`;
		}
	}
	if (affinity === FU.affValue.absorption) {
		if (context.damageOverride.ignoreAbsorption) {
			affinity = FU.affValue.none;
		} else {
			affinityMessage = 'FU.ChatApplyDamageAbsorb';
		}
	}

	context.affinityMessage = affinityMessage;
	context.affinity = affinity;

	if (context.actor.type === 'npc') {
		CommonEvents.reveal(context.actor, {
			affinities: {
				[context.damageType]: true,
			},
		});
	}

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
 * @return {Promise<Boolean>}
 */
async function collectIncrements(context) {
	// Target
	if (context.actor.system.bonuses) {
		const incoming = context.actor.system.bonuses.incomingDamage;

		context.addBonus(`incomingDamage.all`, incoming.all);
		context.addBonus(`incomingDamage.${context.damageType}`, incoming[context.damageType] ?? 0);

		// Potentially modify damage FROM a specific species (NPC)
		if (context.sourceActor && context.sourceActor.system.species) {
			const species = context.sourceActor.system.species.value;
			context.addBonus(`incomingDamage.${species}`, incoming[species] ?? 0);
		}

		// Potentially modify damage TO a specific species (from a PC)
		if (context.actor.system.species) {
			const species = context.actor.system.species.value;
			const outgoing = context.sourceActor.system.bonuses.damage;
			context.addBonus(`damage.${species}`, outgoing[species] ?? 0);
		}
	}

	// Expression
	if (context.extra) {
		const exprCtx = new ExpressionContext(context.sourceActor, context.item, [context.actor]);
		const bonusValue = await Expressions.evaluateAsync(context.extra, exprCtx);
		if (bonusValue > 0) {
			context.addBonus(`extra`, bonusValue);
		}
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
	// If negative modifiers reduce incoming damage below 0...
	if (result < 0) {
		result = 0;
	}
	// Multipliers (*)
	for (const [key, value] of context.modifiers) {
		result *= value;
		context.recordStep(key, `*${value}`, result);
	}

	if (context.traits.has(Traits.NonLethal)) {
		const difference = context.actor.system.resources.hp.value - result;
		if (difference < 0) {
			const reduction = Math.abs(difference) + 1; // Leave at 1 HP
			result -= reduction;
			context.recordStep(Traits.NonLethal, `-${reduction}`, result);
		}
	}

	context.result = Math.floor(result);
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

	console.debug(`Applying damage from request with traits: ${[...request.traits].join(', ')}`);

	const updates = [];
	for (const actor of request.targets) {
		// Create an initial context then run the pipeline
		let context = new DamagePipelineContext(request, actor);

		resolveAffinity(context);
		if (!overrideResult(context)) {
			await collectIncrements(context);
			collectMultipliers(context);
			calculateResult(context);
		}
		if (context.result === undefined) {
			throw new Error('Failed to generate result during pipeline');
		}

		// Provide support for targeting MP instead
		let resource = 'hp';
		if (request.traits.has(Traits.MindPointLoss)) {
			resource = 'mp';
		}

		// Damage application
		let damageTaken = context.result;
		const difference = context.actor.system.resources[resource].value - damageTaken;
		if (difference < 0) {
			damageTaken -= Math.abs(difference);
		}

		// TODO: Print message to chat
		if (damageTaken === 0) {
			ui.notifications.warn(`The damage to ${actor.name} was reduced to 0`);
			continue;
		}

		updates.push(actor.modifyTokenAttribute(`resources.${resource}`, -damageTaken, true));
		TokenUtils.showFloatyText(actor, `${-damageTaken} ${resource.toUpperCase()}`, `red`);

		// Dispatch event
		CommonEvents.damage(request.damageType, damageTaken, context.traits, actor, context.sourceActor);

		// Chat message
		const affinityString = await renderTemplate('systems/projectfu/templates/chat/partials/inline-damage-icon.hbs', {
			damage: damageTaken,
			damageType: game.i18n.localize(FU.damageTypes[request.damageType]),
			affinityIcon: FU.affIcon[context.damageType],
		});

		let flags = Pipeline.initializedFlags(Flags.ChatMessage.Damage, damageTaken);
		Pipeline.setFlag(flags, Flags.ChatMessage.Source, context.sourceInfo);
		const rootUuid = actor.resolveUuid();

		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: game.i18n.localize(FU.affType[context.affinity]),
				flags: flags,
				content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-damage.hbs', {
					message: context.affinityMessage,
					actor: actor.name,
					uuid: actor.uuid,
					rootUuid: rootUuid,
					inspect: actor.type === 'npc',
					// TODO: Replace damage with amount in the localizations
					damage: damageTaken,
					amount: damageTaken,
					type: affinityString,
					from: request.sourceInfo.name,
					resource: resource.toUpperCase(),
					sourceActorUuid: request.sourceInfo.actorUuid,
					sourceItemUuid: request.sourceInfo.itemUuid,
					breakdown: context.breakdown,
				}),
			}),
		);

		// Handle post-damage traits
		if (damageTaken > 0) {
			if (request.traits.has(Traits.MindPointAbsorption)) {
				resource = 'mp';
			}
			if (request.traits.has(Traits.Absorb)) {
				await absorbDamage(resource, damageTaken, context.sourceInfo, [context.sourceActor]);
			} else if (request.traits.has(Traits.AbsorbHalf)) {
				await absorbDamage(resource, damageTaken * 0.5, context.sourceInfo, [context.sourceActor]);
			}
		}
	}
	return Promise.all(updates);
}

function getSourceInfoFromChatMessage(message) {
	const sourceActorUuid = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2)?.actorUuid;
	const sourceItemUuid = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2)?.itemUuid;
	const sourceName = message.getFlag(SYSTEM, Flags.ChatMessage.Item)?.name;
	return new InlineSourceInfo(sourceName, sourceActorUuid, sourceItemUuid);
}

// TODO: Move elsewhere
/**tt
 * @param {Document} message
 * @param {jQuery} jQuery
 */
function onRenderChatMessage(message, jQuery) {
	if (!message.getFlag(SYSTEM, Flags.ChatMessage.Damage)) {
		return;
	}

	// Initialize chat message data
	let disabled = false;

	// Damage prompt application message
	if (ChecksV2.isCheck(message)) {
		const inspector = CheckConfiguration.inspect(message);
		const damageData = inspector.getDamage();
		const traits = inspector.getTraits();

		const sourceInfo = getSourceInfoFromChatMessage(message);

		const customizeDamage = async (event, targets) => {
			DamageCustomizer(
				damageData,
				targets,
				async (damageOverride) => {
					await handleDamageApplication(event, targets, sourceInfo, damageData, damageOverride, traits);
					disabled = false;
				},
				() => {
					disabled = false;
				},
			);
		};

		const applyDefaultDamage = async (event, targets) => {
			return handleDamageApplication(event, targets, sourceInfo, damageData, {}, traits);
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
					damageData,
					targets,
					(damageOverride) => {
						handleDamageApplication(event, targets, sourceInfo, damageData, damageOverride, traits);
						disabled = false;
					},
					() => {
						disabled = false;
					},
				);
			}
		});

		Pipeline.handleClick(message, jQuery, 'retarget', async (dataset) => {
			console.debug(`Retargeting for message id ${message.id}`);
			CheckRetarget.retarget(message.id);
		});
	}
	// Damage applied message
	else {
		Pipeline.handleClick(message, jQuery, 'inspectActor', async (dataset) => {
			const uuid = dataset.uuid;
			return FUPartySheet.inspectAdversary(uuid);
		});

		Pipeline.handleClickRevert(message, jQuery, 'revertDamage', async (dataset) => {
			const uuid = dataset.uuid;
			const actor = fromUuidSync(uuid);
			const updates = [];
			const amountRecovered = dataset.amount;
			const resource = dataset.resource.toLowerCase();
			updates.push(actor.modifyTokenAttribute(`resources.${resource}`, amountRecovered, true));
			TokenUtils.showFloatyText(actor, `${amountRecovered} ${resource}`, `lightgreen`);
			return Promise.all(updates);
		});

		jQuery.find(`a[data-action=toggleBreakdown]`).click(function (event) {
			event.preventDefault();
			jQuery.find('#breakdown').toggleClass('hidden');
		});
	}
}

/**
 *
 * @param {Event} event
 * @param {FUActor[]} targets
 * @param {InlineSourceInfo} sourceInfo
 * @param {DamageData} damageData
 * @param {DamageOverrideInfo} damageOverride
 * @param {String[]} traits
 * @returns {void}
 */
async function handleDamageApplication(event, targets, sourceInfo, damageData, damageOverride, traits) {
	const request = new DamageRequest(sourceInfo, targets, damageData, damageOverride);
	request.event = event;
	traits.forEach((t) => request.traits.add(t));
	if (event.shiftKey) {
		request.traits.add(Traits.IgnoreResistances);
		if (event.ctrlKey || event.metaKey) {
			request.traits.add(Traits.IgnoreImmunities);
		}
	}
	await DamagePipeline.process(request);
}

/**
 * @param {String} resource
 * @param {Number} amount
 * @param {InlineSourceInfo} sourceInfo
 * @returns {Promise<void>}
 */
async function absorbDamage(resource, amount, sourceInfo, targets) {
	const request = new ResourceRequest(sourceInfo, targets, resource, amount, false);
	await ResourcePipeline.processRecovery(request);
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	Hooks.on('renderChatMessage', onRenderChatMessage);

	const onAbsorbDamage = async (message, resource) => {
		const targets = await getSelected();
		const amount = message.getFlag(SYSTEM, Flags.ChatMessage.Damage) * 0.5;
		const sourceInfo = message.getFlag(SYSTEM, Flags.ChatMessage.Source);
		absorbDamage(resource, amount, sourceInfo, targets);
	};

	ChatMessageHelper.registerContextMenuItem(Flags.ChatMessage.Damage, `FU.ChatAbsorbMindPoints`, FU.resourceIcons.mp, (message) => {
		onAbsorbDamage(message, 'mp');
	});
	ChatMessageHelper.registerContextMenuItem(Flags.ChatMessage.Damage, `FU.ChatAbsorbHitPoints`, FU.resourceIcons.hp, (message) => {
		onAbsorbDamage(message, 'hp');
	});
}

export const DamagePipeline = {
	initialize,
	process,
};
