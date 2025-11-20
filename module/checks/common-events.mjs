import { FUHooks } from '../hooks.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { EventCharacters } from '../helpers/event-character.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { CheckConfiguration } from './check-configuration.mjs';

/**
 * @typedef ItemReference
 * @property {String} name
 * @property {String} fuid
 */

/**
 * @param {FUItem} item
 * @returns {ItemReference}
 */
function toItemReference(item) {
	return {
		name: item.name,
		fuid: item.system.fuid,
	};
}

/**
 * @description Dispatched when an actor makes an attack (skill/spell)
 * @typedef AttackEvent
 * @property {ItemReference} item
 * @property {FU.damageTypes} type
 * @property {Set<String>} traits
 * @property {FUActor} actor
 * @property {Token} token
 * @property {EventCharacter} source
 * @property {EventCharacter[]} targets
 * @property {Number} result
 */

/**
 * @description Dispatches an event to signal an attack event
 * @param {CheckInspector} inspector
 * @param {FUActor} actor
 * @param {FUItem} item
 */
function attack(inspector, actor, item) {
	const traits = inspector.getTraits();
	const targets = inspector.getTargets();
	const source = EventCharacters.fromActor(actor);
	const eventTargets = EventCharacters.fromTargetData(targets);
	const result = inspector.getCheck().result;

	/** @type AttackEvent  **/
	const event = {
		item: toItemReference(item),
		actor: actor,
		source: source,
		type: inspector.getDamage()?.type,
		token: source.token,
		targets: eventTargets,
		traits: new Set(traits),
		result: result,
	};
	Hooks.call(FUHooks.ATTACK_EVENT, event);
}

/**
 * @description Dispatched when an actor suffers damage
 * @typedef DamageEvent
 * @property {EventCharacter|null} source
 * @property {DamageType} type
 * @property {InlineSourceInfo} sourceInfo
 * @property {FUDamageSource} damageSource
 * @property {Number} amount
 * @property {EventCharacter} target
 * @property {FUActor} actor
 * @property {Token} token
 * @property {Set<String>} traits
 * @property {String} origin An id used to prevent cascading.
 */

function getDamageSource(item) {
	let damageSource;
	if (item) {
		/** @type ItemType **/
		switch (item.type) {
			case 'spell':
				damageSource = 'spell';
				break;
			case 'basic':
			case 'weapon':
			case 'customWeapon':
				damageSource = 'attack';
				break;
			case 'skill':
			case 'optionalFeature':
			case 'classFeature':
			case 'miscAbility':
				damageSource = 'skill';
				break;
			case 'consumable':
				damageSource = 'item';
				break;
		}
	}
	return damageSource;
}

/**
 * @description Dispatches an event to signal damage taken by an actor
 * @param {FU.damageTypes} type
 * @param {Number} amount
 * @param {Set<String>} traits
 * @param {FUActor} sourceActor
 * @param {FUActor} targetActor
 * @param {InlineSourceInfo} sourceInfo
 */
function damage(type, amount, traits, sourceActor, targetActor, sourceInfo, origin) {
	const source = EventCharacters.fromActor(sourceActor);
	const target = EventCharacters.fromActor(targetActor);
	const item = sourceInfo.resolveItem();
	const damageSource = getDamageSource(item);

	/** @type DamageEvent  **/
	const damageEvent = {
		amount: amount,
		type: type,
		source: source,
		sourceActor: sourceInfo,
		damageSource: damageSource,
		target: target,
		actor: target.actor,
		token: target.token,
		traits: traits,
		origin: origin,
	};
	Hooks.call(FUHooks.DAMAGE_EVENT, damageEvent);
}

/**
 * @typedef CalculateDamageEvent
 * @property {EventCharacter} source
 * @property {FUItem} item
 * @property {FUDamageSource} damageSource
 * @property {EventCharacter[]} targets
 * @property {CheckConfigurer} configuration
 */

async function calculateDamage(actor, item, configuration) {
	const damageSource = getDamageSource(item);
	const targets = configuration.getTargets();
	const event = {
		source: EventCharacters.fromActor(actor),
		targets: EventCharacters.fromTargetData(targets),
		damageSource: damageSource,
		configuration: configuration,
	};
	Hooks.call(FUHooks.CALCULATE_DAMAGE_EVENT, event);
	await new Promise((resolve) => setTimeout(resolve, 10));
}

/**
 * @description Dispatched when an actor enters crisis
 * @typedef CrisisEvent
 * @property {FUActor} actor
 * @property {Token} token
 */

/**
 * @description Dispatched when an actor is reduced to 0 HP
 * @typedef DefeatEvent
 * @property {FUActor} actor
 * @property {Token} token
 */

/**
 * @description Dispatched when an actor has a status toggled.
 * @typedef StatusEvent
 * @property {FUActor} actor
 * @property {Token} token
 * @property {EventCharacter} source
 * @property {String} status The id of the status effect
 * @property {String} enabled Whether the effect is enabled
 */

/**
 * @description Dispatches an event to signal an effect has been applied onto an actor
 * @param {FUActor} actor
 * @param {String} statusEffectId
 * @param {Boolean} enabled
 */
function status(actor, statusEffectId, enabled) {
	const source = EventCharacters.fromActor(actor);
	Hooks.call(
		FUHooks.STATUS_EVENT,
		/** @type StatusEvent **/
		{
			source: source,
			actor: actor,
			token: source.token,
			status: statusEffectId,
			enabled: enabled,
		},
	);
}

/**
 * @description Dispatched when an actor recovers resources (such as HP, MP)
 * @typedef GainEvent
 * @property {FU.resources} resource
 * @property {Number} amount
 * @property {EventCharacter} source
 * @property {FUActor} actor
 * @property {Token} token
 * @property {String} origin
 */

function gain(actor, resource, amount, origin) {
	/** @type GainEvent  **/
	const gainEvent = {
		amount: amount,
		resource: resource,
		actor: actor,
		token: actor.resolveToken(),
		origin: origin,
	};
	Hooks.call(FUHooks.GAIN_EVENT, gainEvent);
}

/**
 * @description Dispatched when an actor gains resources (such as HP, MP)
 * @typedef LossEvent
 * @property {FU.resources} resource
 * @property {Number} amount
 * @property {EventCharacter} source
 * @property {FUActor} actor
 * @property {Token} token
 * @property {String} origin
 */

function loss(actor, resource, amount, origin) {
	/** @type LossEvent  **/
	const lossEvent = {
		amount: amount,
		resource: resource,
		actor: actor,
		token: actor.resolveToken(),
		origin: origin,
	};
	Hooks.call(FUHooks.LOSS_EVENT, lossEvent);
}

/**
 * @description Dispatched when an actor updates its resources (such as HP, MP)
 * @typedef ResourceUpdateEvent
 * @property {FUResourceType} resource
 * @property {Number} amount
 * @property {EventCharacter} source
 * @property {EventCharacter[]} targets
 * @property {String} origin
 */

/**
 * @param {FUActor} sourceActor
 * @param {FUActor[]} targetActors
 * @param {FUResourceType} resource
 * @param {Number} amount
 * @param {String} origin
 */
function resource(sourceActor, targetActors, resource, amount, origin) {
	const source = EventCharacters.fromActor(sourceActor);
	const targets = EventCharacters.fromActors(targetActors);
	/** @type ResourceUpdateEvent  **/
	const event = {
		amount: amount,
		resource: resource,
		source: source,
		targets: targets,
		origin: origin,
	};
	Hooks.call(FUHooks.RESOURCE_UPDATE, event);
}

/**
 * @description Dispatched when an actor updates its resources (such as HP, MP)
 * @typedef ResourceExpendEvent
 * @property {ResourceExpense} expense
 * @property {EventCharacter} source
 * @property {EventCharacter[]} targets
 * @property {String} origin
 */

async function expendResource(sourceActor, targetActors, expense) {
	const source = EventCharacters.fromActor(sourceActor);
	const targets = EventCharacters.fromTargetData(targetActors);
	/** @type ResourceUpdateEvent  **/
	const event = {
		expense: expense,
		source: source,
		targets: targets,
	};
	Hooks.call(FUHooks.RESOURCE_EXPEND_EVENT, event);
	await new Promise((resolve) => setTimeout(resolve, 10));
}

/**
 * @description Dispatched when an actor performs a spell without a magic check.
 * @typedef SpellEvent
 * @property {ItemReference} item
 * @property {Set<String>} traits
 * @property {SpellDataModel} spell
 * @property {EventCharacter} source
 * @property {FUActor} actor
 * @property {Token} token
 * @property {EventCharacter[]} targets
 */

/**
 * @description Dispatches an event to signal a spell event
 * @param {FUActor} actor
 * @param {FUItem} item
 */
function spell(actor, item) {
	/** @type SpellDataModel **/
	const spell = item.system;
	const traits = new Set();
	traits.add('spell');
	traits.add(spell.cost.resource);

	const source = EventCharacters.fromActor(actor);
	const targets = Targeting.getSerializedTargetData();
	const eventTargets = EventCharacters.fromTargetData(targets);

	/** @type SpellEvent  **/
	const event = {
		item: toItemReference(item),
		source: source,
		actor: source.actor,
		token: source.token,
		spell: spell,
		targets: eventTargets,
		traits: traits,
	};
	Hooks.call(FUHooks.SPELL_EVENT, event);
}

/**
 * @description Dispatched when an actor performs a skill without am accuracy check.
 * @typedef SkillEvent
 * @property {ItemReference} item
 * @property {Set<String>} traits
 * @property {EventCharacter} source
 * @property {FUActor} actor
 * @property {Token} token
 * @property {EventCharacter[]} targets
 */

/**
 * @description Dispatches an event to signal a skill event
 * @param {FUActor} actor
 * @param {FUItem} item
 */
function skill(actor, item, targets = undefined) {
	/** @type SkillDataModel **/
	const skill = item.system;
	const traits = new Set();
	traits.add('skill');
	if (skill.cost) {
		traits.add(skill.cost.resource);
	}

	const source = EventCharacters.fromActor(actor);
	targets = targets ?? Targeting.getSerializedTargetData();
	const eventTargets = EventCharacters.fromTargetData(targets);

	/** @type SpellEvent  **/
	const event = {
		item: toItemReference(item),
		source: source,
		actor: source.actor,
		token: source.token,
		targets: eventTargets,
		traits: traits,
	};
	Hooks.call(FUHooks.SKILL_EVENT, event);
}

/**
 * @description Dispatched when an actor performs a skill without am accuracy check.
 * @typedef ItemEvent
 * @property {ItemReference} item
 * @property {FUActor} actor
 * @property {String} type The item type
 * @property {Token} token
 * @property {EventCharacter[]} targets
 */

/**
 * @description Dispatches an event to signal the usage of a consumable
 * @param {FUActor} actor
 * @param {FUItem} item
 */
function item(actor, item) {
	/** @type ConsumableDataModel  **/
	const consumable = item.system;
	const targets = Targeting.getSerializedTargetData();
	const eventTargets = EventCharacters.fromTargetData(targets);

	/** @type ItemEvent  **/
	const event = {
		item: toItemReference(item),
		actor: actor,
		type: consumable.subtype.value,
		token: actor.resolveToken(),
		targets: eventTargets,
	};
	Hooks.call(FUHooks.ITEM_EVENT, event);
}

/**
 * @description Dispatched when an actor performs a study check
 * @typedef StudyEvent
 * @property {FUActor} actor The actor who performed the study action
 * @property {Token} token
 * @property {EventCharacter[]} targets
 * @property {Number} result
 */

/**
 * @param {FUActor }actor
 * @param {FUActor[]} targets
 * @param {Number} studyValue
 */
function study(actor, targets, studyValue) {
	const targetData = Targeting.serializeTargetData(targets);
	const eventTargets = EventCharacters.fromTargetData(targetData);

	/** @type ItemEvent  **/
	const event = {
		actor: actor,
		token: actor.resolveToken(),
		targets: eventTargets,
		result: studyValue,
	};
	Hooks.call(FUHooks.STUDY_EVENT, event);
}

/**
 * @typedef RestEvent
 * @description Dispatched when an actor rests
 * @property {FUActor} actor
 */

function rest(actor) {
	/** @type RestEvent  **/
	const event = {
		actor: actor,
	};
	Hooks.call(FUHooks.REST_EVENT, event);
}

/**
 * @typedef RevealEvent
 * @description Dispatched when information about an actor is revealed
 * @property {FUActor} actor
 * @property {NpcProfileRevealData} revealed
 */

/**
 *
 * @param {FUActor} actor
 * @param {NpcProfileRevealData} revealed
 */
function reveal(actor, revealed) {
	/** @type RevealEvent  **/
	const event = {
		actor: actor,
		revealed: revealed,
	};
	Hooks.call(FUHooks.REVEAL_EVENT, event);
}

/**
 * @typedef OpportunityEvent
 * @description Dispatched when a character gets an opportunity
 * @property {FUActor} actor
 * @property {String} type The type of check that led to the opportunity
 * @property {FUItem} item The item that prompted the check
 * @property {Boolean} fumble If the opportunity came from a fumble, which goes to the opposition of the actor.
 */

function opportunity(actor, type, item, fumble) {
	/** @type OpportunityEvent  **/
	const event = {
		actor: actor,
		type: type,
		item: item,
		fumble: fumble,
	};
	Hooks.call(FUHooks.OPPORTUNITY_EVENT, event);
}

/**
 * @typedef ProgressEvent
 * @description Dispatched when a progress track has been updated
 * @property {Document} document The document that has the tracker
 * @property {ProgressDataModel} progress The tracker in question
 * @property {"add"|"remove"|"update"} action The action that was performed
 * @property {Number|undefined} increment If an update was performed, the change in the tracker,
 * @property {Document|undefined} source If an update was performed, the source behind the change.
 */

function progress(document, progress, action, increment = undefined, source = undefined) {
	/** @type ProgressEvent  **/
	const event = {
		document: document,
		progress: progress,
		action: action,
		increment: increment,
		source: source,
	};
	Hooks.call(FUHooks.PROGRESS_EVENT, event);
}

/**
 * @typedef PerformCheckEvent
 * @property {Check} check
 * @property {EventCharacter} source
 * @property {InlineSourceInfo} sourceInfo
 * @property {EventCharacter[]} targets
 * @remarks Emitted when a check is about to be performed
 */

/**
 * @typedef ResolveCheckEvent
 * @property {CheckResultV2} result
 * @property {EventCharacter} source
 * @property {InlineSourceInfo} sourceInfo
 * @remarks Emitted when a check is about to be performed
 */

function performCheck(check, actor, item) {
	const sourceInfo = InlineSourceInfo.fromInstance(actor, item);
	const source = EventCharacters.fromActor(actor);
	const inspector = CheckConfiguration.inspect(check);
	const targetData = inspector.getTargets();
	let targets = [];
	if (targetData) {
		targets = EventCharacters.fromTargetData(targetData);
	}
	/** @type PerformCheckEvent  **/
	const event = {
		check: check,
		source: source,
		sourceInfo: sourceInfo,
		targets: targets,
	};
	Hooks.call(FUHooks.PERFORM_CHECK_EVENT, event);
}

function resolveCheck(result, actor, item) {
	const sourceInfo = InlineSourceInfo.fromInstance(actor, item);
	const source = EventCharacters.fromActor(actor);
	/** @type PerformCheckEvent  **/
	const event = {
		result: result,
		source: source,
		sourceInfo: sourceInfo,
	};
	Hooks.call(FUHooks.RESOLVE_CHECK_EVENT, event);
}

/**
 * @typedef NotificationEvent
 * @property {EventCharacter} source
 * @property {String} id
 * @property {String} origin
 */

function notify(source, id, origin) {
	const event = {
		source: source,
		id: id,
		origin: origin,
	};
	Hooks.call(FUHooks.NOTIFICATION_EVENT, event);
}

export const CommonEvents = Object.freeze({
	attack,
	damage,
	status,
	gain,
	loss,
	resource,
	expendResource,
	spell,
	skill,
	item,
	study,
	rest,
	reveal,
	opportunity,
	progress,
	performCheck,
	resolveCheck,
	calculateDamage,
	notify,
});

// Helpers
