import { systemId } from '../helpers/system-utils.mjs';
import { SETTINGS } from '../settings.js';
import { FUHooks } from '../hooks.mjs';
import { FUItem } from '../documents/items/item.mjs';

import { CombatEventRuleTrigger } from '../documents/effects/triggers/combat-event-rule-trigger.mjs';
import { AttackRuleTrigger } from '../documents/effects/triggers/attack-rule-trigger.mjs';
import { MessageRuleAction } from '../documents/effects/actions/message-rule-action.mjs';
import { ApplyDamageRuleAction } from '../documents/effects/actions/apply-damage-rule-action.mjs';
import { UpdateResourceRuleAction } from '../documents/effects/actions/update-resource-rule-action.mjs';
import { ApplyEffectRuleAction } from '../documents/effects/actions/apply-effect-rule-action.mjs';
import { ClearEffectRuleAction } from '../documents/effects/actions/clear-effect-rule-action.mjs';
import { StatusRuleTrigger } from '../documents/effects/triggers/status-rule-trigger.mjs';
import { FUCombat } from '../ui/combat.mjs';
import { EventCharacters } from '../helpers/event-character.mjs';
import { DamageRuleTrigger } from '../documents/effects/triggers/damage-rule-trigger.mjs';
import { RuleActionRegistry } from '../documents/effects/actions/rule-action-data-model.mjs';
import { RuleTriggerRegistry } from '../documents/effects/triggers/rule-trigger-data-model.mjs';
import { RulePredicateRegistry } from '../documents/effects/predicates/rule-predicate-data-model.mjs';
import { BondRulePredicate } from '../documents/effects/predicates/bond-rule-predicate.mjs';
import { FactionRelationRulePredicate } from '../documents/effects/predicates/faction-relation-rule-predicate.mjs';
import { CalculateDamageRuleTrigger } from '../documents/effects/triggers/calculate-damage-rule-trigger.mjs';
import { EffectRulePredicate } from '../documents/effects/predicates/effect-rule-predicate.mjs';
import { RuleElementContext } from '../documents/effects/rule-element-context.mjs';
import { ChangeTraitsRuleAction } from '../documents/effects/actions/change-traits-rule-action.mjs';
import { SpeciesRulePredicate } from '../documents/effects/predicates/species-rule-predicate.mjs';
import { WeaponRulePredicate } from '../documents/effects/predicates/weapon-rule-predicate.mjs';
import { ResourceRulePredicate } from '../documents/effects/predicates/resource-rule-predicate.mjs';
import { ResourceUpdateRuleTrigger } from '../documents/effects/triggers/resource-update-rule-trigger.mjs';
import { SpellRuleTrigger } from '../documents/effects/triggers/spell-rule-trigger.mjs';
import { PerformCheckRuleTrigger } from '../documents/effects/triggers/perform-check-rule-trigger.mjs';
import { ModifyCheckRuleAction } from '../documents/effects/actions/modify-check-rule-action.mjs';
import { ResolveCheckRuleTrigger } from '../documents/effects/triggers/resolve-check-rule-trigger.mjs';
import { ModifyDamageRuleAction } from '../documents/effects/actions/modify-damage-rule-action.mjs';
import { NotifyRuleAction } from '../documents/effects/actions/notify-rule-action.mjs';
import { NotificationRuleTrigger } from '../documents/effects/triggers/notification-rule-trigger.mjs';

function register() {
	RuleTriggerRegistry.instance.register(systemId, CombatEventRuleTrigger.TYPE, CombatEventRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, AttackRuleTrigger.TYPE, AttackRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, StatusRuleTrigger.TYPE, StatusRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, DamageRuleTrigger.TYPE, DamageRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, CalculateDamageRuleTrigger.TYPE, CalculateDamageRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, ResourceUpdateRuleTrigger.TYPE, ResourceUpdateRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, SpellRuleTrigger.TYPE, SpellRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, PerformCheckRuleTrigger.TYPE, PerformCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, ResolveCheckRuleTrigger.TYPE, ResolveCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, NotificationRuleTrigger.TYPE, NotificationRuleTrigger);

	RuleActionRegistry.instance.register(systemId, MessageRuleAction.TYPE, MessageRuleAction);
	RuleActionRegistry.instance.register(systemId, ApplyDamageRuleAction.TYPE, ApplyDamageRuleAction);
	RuleActionRegistry.instance.register(systemId, UpdateResourceRuleAction.TYPE, UpdateResourceRuleAction);
	RuleActionRegistry.instance.register(systemId, ApplyEffectRuleAction.TYPE, ApplyEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, ClearEffectRuleAction.TYPE, ClearEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, ChangeTraitsRuleAction.TYPE, ChangeTraitsRuleAction);
	RuleActionRegistry.instance.register(systemId, ModifyCheckRuleAction.TYPE, ModifyCheckRuleAction);
	RuleActionRegistry.instance.register(systemId, ModifyDamageRuleAction.TYPE, ModifyDamageRuleAction);
	RuleActionRegistry.instance.register(systemId, NotifyRuleAction.TYPE, NotifyRuleAction);

	RulePredicateRegistry.instance.register(systemId, BondRulePredicate.TYPE, BondRulePredicate);
	RulePredicateRegistry.instance.register(systemId, FactionRelationRulePredicate.TYPE, FactionRelationRulePredicate);
	RulePredicateRegistry.instance.register(systemId, EffectRulePredicate.TYPE, EffectRulePredicate);
	RulePredicateRegistry.instance.register(systemId, SpeciesRulePredicate.TYPE, SpeciesRulePredicate);
	RulePredicateRegistry.instance.register(systemId, WeaponRulePredicate.TYPE, WeaponRulePredicate);
	RulePredicateRegistry.instance.register(systemId, ResourceRulePredicate.TYPE, ResourceRulePredicate);
}

/**
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function onCombatEvent(event) {
	const source = event.combatant ? EventCharacters.fromCombatant(event.combatant) : null;
	const combatants = event.combatant ? [event.combatant] : event.combatants;
	await evaluate(FUHooks.COMBAT_EVENT, event, source, EventCharacters.fromCombatants(combatants));
}

/**
 * @param {AttackEvent} event
 * @returns {Promise<void>}
 */
async function onAttackEvent(event) {
	await evaluate(FUHooks.ATTACK_EVENT, event, event.source, event.targets);
}

/**
 * @param {DamageEvent} event
 * @returns {Promise<void>}
 */
async function onDamageEvent(event) {
	await evaluate(FUHooks.DAMAGE_EVENT, event, event.source, [EventCharacters.fromActor(event.actor)]);
}

/**
 * @param {ResourceUpdateEvent} event
 * @returns {Promise<void>}
 */
async function onResourceEvent(event) {
	await evaluate(FUHooks.RESOURCE_UPDATE, event, event.source, event.targets);
}

/**
 * @param {SpellEvent} event
 * @returns {Promise<void>}
 */
async function onSpellEvent(event) {
	await evaluate(FUHooks.SPELL_EVENT, event, event.source, event.targets);
}

/**
 * @param {CalculateDamageEvent} event
 * @returns {Promise<void>}
 */
async function onCalculateDamageEvent(event) {
	await evaluate(FUHooks.CALCULATE_DAMAGE_EVENT, event, event.source, event.targets);
}

/**
 * @param {StatusEvent} event
 * @returns {Promise<void>}
 */
async function onStatusEvent(event) {
	await evaluate(FUHooks.STATUS_EVENT, event, event.source, [event.source]);
}

/**
 * @param {PerformCheckEvent} event
 * @returns {Promise<void>}
 */
async function onPerformCheckEvent(event) {
	await evaluate(FUHooks.PERFORM_CHECK_EVENT, event, event.source, event.targets);
}

/**
 * @param {ResolveCheckEvent} event
 * @returns {Promise<void>}
 */
async function onResolveCheckEvent(event) {
	await evaluate(FUHooks.RESOLVE_CHECK_EVENT, event, event.source, [event.source]);
}

/**
 * @param {NotificationEvent} event
 * @returns {Promise<void>}
 */
async function onNotificationEvent(event) {
	await evaluate(FUHooks.NOTIFICATION_EVENT, event, event.source, [event.source]);
}

/**
 * @param {EventCharacter[]} targets
 * @returns {EventCharacter[]}
 */
function getSceneCharacters(targets) {
	/** @type EventCharacter[] **/
	let sceneCharacters = [];
	if (FUCombat.hasActiveEncounter) {
		const combatants = Array.from(FUCombat.activeEncounter.combatants.values());
		const combatCharacters = EventCharacters.fromCombatants(combatants);
		sceneCharacters.push(...combatCharacters);
	}
	const uuids = new Set(sceneCharacters.map((c) => c.actor.uuid));
	return [...sceneCharacters, ...targets.filter((ec) => !uuids.has(ec.name))];
}

/**
 * @param {String} type
 * @param {*} event
 * @param {EventCharacter} source
 * @param {EventCharacter[]} targets
 */
async function evaluate(type, event, source, targets) {
	const sceneCharacters = getSceneCharacters(targets);
	for (const character of sceneCharacters) {
		for (const effect of character.actor.allEffects()) {
			const disabled = effect.suppressed || effect.disabled;
			if (disabled) {
				continue;
			}
			/** @type RuleElementContext **/
			let contextData = {
				type: type,
				effect: effect,
				event: event,
				character: character,
				source: source,
				targets: targets,
				scene: {
					characters: sceneCharacters,
				},
			};
			if (effect.parent instanceof FUItem) {
				contextData.item = effect.parent;
			}
			const context = new RuleElementContext(contextData);

			for (const element of effect.system.rules.elements) {
				await element.evaluate(context);
			}
		}
	}
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	if (!game.settings.get(systemId, SETTINGS.optionAutomationRuleElements)) {
		return;
	}
	Hooks.on(FUHooks.COMBAT_EVENT, onCombatEvent);
	Hooks.on(FUHooks.ATTACK_EVENT, onAttackEvent);
	Hooks.on(FUHooks.STATUS_EVENT, onStatusEvent);
	Hooks.on(FUHooks.DAMAGE_EVENT, onDamageEvent);
	Hooks.on(FUHooks.CALCULATE_DAMAGE_EVENT, onCalculateDamageEvent);
	Hooks.on(FUHooks.RESOURCE_UPDATE, onResourceEvent);
	Hooks.on(FUHooks.SPELL_EVENT, onSpellEvent);
	Hooks.on(FUHooks.PERFORM_CHECK_EVENT, onPerformCheckEvent);
	Hooks.on(FUHooks.RESOLVE_CHECK_EVENT, onResolveCheckEvent);
	Hooks.on(FUHooks.NOTIFICATION_EVENT, onNotificationEvent);
}

export const RuleElements = Object.freeze({
	register,
	initialize,
});
