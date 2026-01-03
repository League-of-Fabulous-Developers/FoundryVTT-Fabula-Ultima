import { systemId } from '../helpers/system-utils.mjs';
import { SETTINGS } from '../settings.js';
import { FUHooks as FUhooks, FUHooks } from '../hooks.mjs';
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
import { CharacterInfo } from '../helpers/character-info.mjs';
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
import { SpellRulePredicate } from '../documents/effects/predicates/spell-rule-predicate.mjs';
import { PerformCheckRuleTrigger } from '../documents/effects/triggers/perform-check-rule-trigger.mjs';
import { ModifyCheckRuleAction } from '../documents/effects/actions/modify-check-rule-action.mjs';
import { ResolveCheckRuleTrigger } from '../documents/effects/triggers/resolve-check-rule-trigger.mjs';
import { ModifyDamageRuleAction } from '../documents/effects/actions/modify-damage-rule-action.mjs';
import { NotifyRuleAction } from '../documents/effects/actions/notify-rule-action.mjs';
import { NotificationRuleTrigger } from '../documents/effects/triggers/notification-rule-trigger.mjs';
import { ResourceExpendRuleTrigger } from '../documents/effects/triggers/resource-expend-rule-trigger.mjs';
import { ModifyExpenseRuleAction } from '../documents/effects/actions/modify-expense-rule-action.mjs';
import { TargetingRulePredicate } from '../documents/effects/predicates/targeting-rule-predicate.mjs';
import { ToggleRuleTrigger } from '../documents/effects/triggers/toggle-rule-trigger.mjs';
import { UpdateTrackRuleAction } from '../documents/effects/actions/update-track-rule-action.mjs';
import { AsyncHooks } from '../helpers/async-hooks.mjs';
import { UpdateTokenRuleAction } from '../documents/effects/actions/update-token-rule-action.mjs';
import { PlaySoundEffectRuleAction } from '../documents/effects/actions/play-sound-effect-rule-action.mjs';
import { ExecuteMacroRuleAction } from '../documents/effects/actions/execute-macro-rule-action.mjs';
import { RenderCheckRuleTrigger } from '../documents/effects/triggers/render-check-rule-trigger.mjs';
import { InitializeCheckRuleTrigger } from '../documents/effects/triggers/initialize-check-rule-trigger.mjs';
import { ModifyConsumableRuleAction } from '../documents/effects/actions/modify-consumable-rule-action.mjs';
import { CreateConsumableRuleTrigger } from '../documents/effects/triggers/create-consumable-rule-trigger.mjs';
import { TraitsRulePredicate } from '../documents/effects/predicates/traits-rule-predicate.mjs';
import { CheckRulePredicate } from '../documents/effects/predicates/check-rule-predicate.mjs';
import { PerformCheckRuleAction } from '../documents/effects/actions/perform-check-rule-action.mjs';
import { ModifyResourceRuleAction } from '../documents/effects/actions/modify-resource-rule-action.mjs';
import { CalculateResourceRuleTrigger } from '../documents/effects/triggers/calculate-resource-rule-trigger.mjs';
import { OpenApplicationRuleAction } from '../documents/effects/actions/open-application-rule-action.mjs';

function register() {
	RuleTriggerRegistry.instance.register(systemId, CombatEventRuleTrigger.TYPE, CombatEventRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, AttackRuleTrigger.TYPE, AttackRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, StatusRuleTrigger.TYPE, StatusRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, DamageRuleTrigger.TYPE, DamageRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, CalculateDamageRuleTrigger.TYPE, CalculateDamageRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, CalculateResourceRuleTrigger.TYPE, CalculateResourceRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, ResourceUpdateRuleTrigger.TYPE, ResourceUpdateRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, ResourceExpendRuleTrigger.TYPE, ResourceExpendRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, InitializeCheckRuleTrigger.TYPE, InitializeCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, PerformCheckRuleTrigger.TYPE, PerformCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, ResolveCheckRuleTrigger.TYPE, ResolveCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, RenderCheckRuleTrigger.TYPE, RenderCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, NotificationRuleTrigger.TYPE, NotificationRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, ToggleRuleTrigger.TYPE, ToggleRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, CreateConsumableRuleTrigger.TYPE, CreateConsumableRuleTrigger);

	RuleActionRegistry.instance.register(systemId, MessageRuleAction.TYPE, MessageRuleAction);
	RuleActionRegistry.instance.register(systemId, ApplyDamageRuleAction.TYPE, ApplyDamageRuleAction);
	RuleActionRegistry.instance.register(systemId, UpdateResourceRuleAction.TYPE, UpdateResourceRuleAction);
	RuleActionRegistry.instance.register(systemId, ApplyEffectRuleAction.TYPE, ApplyEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, ClearEffectRuleAction.TYPE, ClearEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, ChangeTraitsRuleAction.TYPE, ChangeTraitsRuleAction);
	RuleActionRegistry.instance.register(systemId, ModifyCheckRuleAction.TYPE, ModifyCheckRuleAction);
	RuleActionRegistry.instance.register(systemId, ModifyDamageRuleAction.TYPE, ModifyDamageRuleAction);
	RuleActionRegistry.instance.register(systemId, ModifyExpenseRuleAction.TYPE, ModifyExpenseRuleAction);
	RuleActionRegistry.instance.register(systemId, NotifyRuleAction.TYPE, NotifyRuleAction);
	RuleActionRegistry.instance.register(systemId, UpdateTrackRuleAction.TYPE, UpdateTrackRuleAction);
	RuleActionRegistry.instance.register(systemId, UpdateTokenRuleAction.TYPE, UpdateTokenRuleAction);
	RuleActionRegistry.instance.register(systemId, PlaySoundEffectRuleAction.TYPE, PlaySoundEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, ExecuteMacroRuleAction.TYPE, ExecuteMacroRuleAction);
	RuleActionRegistry.instance.register(systemId, ModifyConsumableRuleAction.TYPE, ModifyConsumableRuleAction);
	RuleActionRegistry.instance.register(systemId, PerformCheckRuleAction.TYPE, PerformCheckRuleAction);
	RuleActionRegistry.instance.register(systemId, ModifyResourceRuleAction.TYPE, ModifyResourceRuleAction);
	RuleActionRegistry.instance.register(systemId, OpenApplicationRuleAction.TYPE, OpenApplicationRuleAction);

	RulePredicateRegistry.instance.register(systemId, BondRulePredicate.TYPE, BondRulePredicate);
	RulePredicateRegistry.instance.register(systemId, FactionRelationRulePredicate.TYPE, FactionRelationRulePredicate);
	RulePredicateRegistry.instance.register(systemId, EffectRulePredicate.TYPE, EffectRulePredicate);
	RulePredicateRegistry.instance.register(systemId, SpeciesRulePredicate.TYPE, SpeciesRulePredicate);
	RulePredicateRegistry.instance.register(systemId, WeaponRulePredicate.TYPE, WeaponRulePredicate);
	RulePredicateRegistry.instance.register(systemId, ResourceRulePredicate.TYPE, ResourceRulePredicate);
	RulePredicateRegistry.instance.register(systemId, TargetingRulePredicate.TYPE, TargetingRulePredicate);
	RulePredicateRegistry.instance.register(systemId, TraitsRulePredicate.TYPE, TraitsRulePredicate);
	RulePredicateRegistry.instance.register(systemId, SpellRulePredicate.TYPE, SpellRulePredicate);
	RulePredicateRegistry.instance.register(systemId, CheckRulePredicate.TYPE, CheckRulePredicate);
}

/**
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function onCombatEvent(event) {
	const source = event.combatant ? CharacterInfo.fromCombatant(event.combatant) : null;
	const combatants = event.combatant ? [event.combatant] : event.combatants;
	await evaluate(FUHooks.COMBAT_EVENT, event, source, CharacterInfo.fromCombatants(combatants));
}

/**
 * @param {AttackEvent} event
 * @returns {Promise<void>}
 */
async function onAttackEvent(event) {
	await evaluate(FUHooks.ATTACK_EVENT, event, event.source, event.targets, event.check);
}

/**
 * @param {DamageEvent} event
 * @returns {Promise<void>}
 */
async function onDamageEvent(event) {
	await evaluate(FUHooks.DAMAGE_EVENT, event, event.source, [CharacterInfo.fromActor(event.actor)]);
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
 * @param {CalculateResourceEvent} event
 * @returns {Promise<void>}
 */
async function onCalculateResourceEvent(event) {
	await evaluate(FUHooks.CALCULATE_RESOURCE_EVENT, event, event.source, event.targets);
}

/**
 * @param {CalculateDamageEvent} event
 * @returns {Promise<void>}
 */
async function onResourceExpenditureEvent(event) {
	await evaluate(FUHooks.RESOURCE_EXPEND_EVENT, event, event.source, event.targets);
}

/**
 * @param {StatusEvent} event
 * @returns {Promise<void>}
 */
async function onStatusEvent(event) {
	await evaluate(FUHooks.STATUS_EVENT, event, event.source, [event.source]);
}

/**
 * @param {CreateConsumableEvent} event
 * @returns {Promise<void>}
 */
async function onCreateConsumableEvent(event) {
	await evaluate(FUHooks.CONSUMABLE_CREATE_EVENT, event, event.source, event.targets);
}

/**
 * @param {InitializeCheckEvent} event
 * @returns {Promise<void>}
 */
async function onInitializeCheckEvent(event) {
	await evaluate(FUHooks.INITIALIZE_CHECK_EVENT, event, event.source, event.targets, {
		check: event.config.check,
		config: event.config,
	});
}

/**
 * @param {PerformCheckEvent} event
 * @returns {Promise<void>}
 */
async function onPerformCheckEvent(event) {
	await evaluate(FUHooks.PERFORM_CHECK_EVENT, event, event.source, event.targets, {
		check: event.check,
	});
}

/**
 * @param {ResolveCheckEvent} event
 * @returns {Promise<void>}
 */
async function onResolveCheckEvent(event) {
	await evaluate(FUHooks.RESOLVE_CHECK_EVENT, event, event.source, event.targets, {
		check: event.check,
	});
}

/**
 * @param {RenderCheckEvent} event
 * @returns {Promise<void>}
 */
async function onRenderCheckEvent(event) {
	await evaluate(FUHooks.RENDER_CHECK_EVENT, event, event.source, event.targets, {
		check: event.check,
		config: event.config,
	});
}

/**
 * @param {NotificationEvent} event
 * @returns {Promise<void>}
 */
async function onNotificationEvent(event) {
	await evaluate(FUHooks.NOTIFICATION_EVENT, event, event.source, [event.source]);
}

/**
 * @param {NotificationEvent} event
 * @returns {Promise<void>}
 */
async function onEffectToggledEvent(event) {
	await evaluate(FUHooks.EFFECT_TOGGLED_EVENT, event, event.source, []);
}

/**
 * @param {CharacterInfo[]} targets
 * @returns {CharacterInfo[]}
 */
function getSceneCharacters(targets) {
	/** @type CharacterInfo[] **/
	let sceneCharacters = [];
	if (FUCombat.hasActiveEncounter) {
		const combatants = Array.from(FUCombat.activeEncounter.combatants.values());
		const combatCharacters = CharacterInfo.fromCombatants(combatants);
		sceneCharacters.push(...combatCharacters);
	}
	const uuids = new Set(sceneCharacters.map((c) => c.actor.uuid));
	return [...sceneCharacters, ...targets.filter((ec) => !uuids.has(ec.actor.uuid))];
}

/**
 * @param {String} type
 * @param {*} event
 * @param {CharacterInfo} source
 * @param {CharacterInfo[]} targets
 * @param {RuleElementContext} data Properties for the rule element context.
 */
async function evaluate(type, event, source, targets, data) {
	// Always include the source as part of the scene character pool; useful for when they are not part of the encounter
	const sceneCharacters = getSceneCharacters([source, ...targets]);
	for (const character of sceneCharacters) {
		for (const effect of character.actor.allEffects()) {
			const disabled = effect.suppressed || effect.disabled;
			if (disabled || effect.system.rules.elements.size === 0) {
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
				...data,
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
	Hooks.on(FUHooks.RESOURCE_UPDATE, onResourceEvent);
	Hooks.on(FUHooks.SPELL_EVENT, onSpellEvent);
	Hooks.on(FUHooks.PERFORM_CHECK_EVENT, onPerformCheckEvent);
	Hooks.on(FUHooks.RESOLVE_CHECK_EVENT, onResolveCheckEvent);
	Hooks.on(FUHooks.NOTIFICATION_EVENT, onNotificationEvent);
	Hooks.on(FUHooks.RESOURCE_EXPEND_EVENT, onResourceExpenditureEvent);
	Hooks.on(FUHooks.EFFECT_TOGGLED_EVENT, onEffectToggledEvent);
	AsyncHooks.on(FUHooks.CALCULATE_DAMAGE_EVENT, onCalculateDamageEvent);
	AsyncHooks.on(FUHooks.CALCULATE_RESOURCE_EVENT, onCalculateResourceEvent);
	AsyncHooks.on(FUHooks.RENDER_CHECK_EVENT, onRenderCheckEvent);
	AsyncHooks.on(FUHooks.INITIALIZE_CHECK_EVENT, onInitializeCheckEvent);
	AsyncHooks.on(FUhooks.CONSUMABLE_CREATE_EVENT, onCreateConsumableEvent);
}

export const RuleElements = Object.freeze({
	register,
	initialize,
});
