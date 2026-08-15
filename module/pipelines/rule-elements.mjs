import { systemId } from '../helpers/system-utils.mjs';
import { SETTINGS } from '../settings.js';
import { FUHooks } from '../hooks.mjs';

import { CombatRuleTrigger } from '../documents/effects/triggers/combat-rule-trigger.mjs';
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
import { ModifyExpenseRuleAction } from '../documents/effects/actions/modify-expense-rule-action.mjs';
import { TargetingRulePredicate } from '../documents/effects/predicates/targeting-rule-predicate.mjs';
import { ToggleRuleTrigger } from '../documents/effects/triggers/toggle-rule-trigger.mjs';
import { UpdateTrackRuleAction } from '../documents/effects/actions/update-track-rule-action.mjs';
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
import { RankRulePredicate } from '../documents/effects/predicates/rank-rule-predicate.mjs';
import { ItemRollRuleTrigger } from '../documents/effects/triggers/item-roll-rule-trigger.mjs';
import { CalculateExpenseRuleTrigger } from '../documents/effects/triggers/calculate-expense-rule-trigger.mjs';
import { FeatureRuleTrigger } from '../documents/effects/triggers/feature-rule-trigger.mjs';
import { RenderMessageRuleTrigger } from '../documents/effects/triggers/render-message-rule-trigger.mjs';
import { EmptyRuleTrigger } from '../documents/effects/triggers/empty-rule-trigger.mjs';
import { FlagRulePredicate } from '../documents/effects/predicates/flag-rule-predicate.mjs';

import { ProgressTrackRuleTrigger } from '../documents/effects/triggers/progress-track-rule-trigger.mjs';
import { ProgressTrackRulePredicate } from '../documents/effects/predicates/progress-track-predicate.mjs';
import { FUItem } from '../documents/items/item.mjs';

function register() {
	RuleTriggerRegistry.instance.register(systemId, 'emptyRuleTrigger', EmptyRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'combatRuleTrigger', CombatRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'attackRuleTrigger', AttackRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'statusRuleTrigger', StatusRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'damageRuleTrigger', DamageRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'calculateDamageRuleTrigger', CalculateDamageRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'calculateResourceRuleTrigger', CalculateResourceRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'resourceUpdateRuleTrigger', ResourceUpdateRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'calculateExpenseRuleTrigger', CalculateExpenseRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'initializeCheckRuleTrigger', InitializeCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'performCheckRuleTrigger', PerformCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'resolveCheckRuleTrigger', ResolveCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'renderCheckRuleTrigger', RenderCheckRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'notificationRuleTrigger', NotificationRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'toggleRuleTrigger', ToggleRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'createConsumableRuleTrigger', CreateConsumableRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'itemRollRuleTrigger', ItemRollRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'featureRuleTrigger', FeatureRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'renderMessageRuleTrigger', RenderMessageRuleTrigger);
	RuleTriggerRegistry.instance.register(systemId, 'progressTrackRuleTrigger', ProgressTrackRuleTrigger);

	RuleActionRegistry.instance.register(systemId, 'messageRuleAction', MessageRuleAction);
	RuleActionRegistry.instance.register(systemId, 'applyDamageRuleAction', ApplyDamageRuleAction);
	RuleActionRegistry.instance.register(systemId, 'updateResourceRuleAction', UpdateResourceRuleAction);
	RuleActionRegistry.instance.register(systemId, 'applyEffectRuleAction', ApplyEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, 'clearEffectRuleAction', ClearEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, 'changeTraitsRuleAction', ChangeTraitsRuleAction);
	RuleActionRegistry.instance.register(systemId, 'modifyCheckRuleAction', ModifyCheckRuleAction);
	RuleActionRegistry.instance.register(systemId, 'modifyDamageRuleAction', ModifyDamageRuleAction);
	RuleActionRegistry.instance.register(systemId, 'modifyExpenseRuleAction', ModifyExpenseRuleAction);
	RuleActionRegistry.instance.register(systemId, 'notifyRuleAction', NotifyRuleAction);
	RuleActionRegistry.instance.register(systemId, 'updateTrackRuleAction', UpdateTrackRuleAction);
	RuleActionRegistry.instance.register(systemId, 'updateTokenRuleAction', UpdateTokenRuleAction);
	RuleActionRegistry.instance.register(systemId, 'playSoundEffectRuleAction', PlaySoundEffectRuleAction);
	RuleActionRegistry.instance.register(systemId, 'executeMacroRuleAction', ExecuteMacroRuleAction);
	RuleActionRegistry.instance.register(systemId, 'modifyConsumableRuleAction', ModifyConsumableRuleAction);
	RuleActionRegistry.instance.register(systemId, 'performCheckRuleAction', PerformCheckRuleAction);
	RuleActionRegistry.instance.register(systemId, 'modifyResourceRuleAction', ModifyResourceRuleAction);
	RuleActionRegistry.instance.register(systemId, 'openApplicationRuleAction', OpenApplicationRuleAction);

	RulePredicateRegistry.instance.register(systemId, 'bondRulePredicate', BondRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'factionRelationRulePredicate', FactionRelationRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'targetEffectRulePredicate', EffectRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'speciesRulePredicate', SpeciesRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'rankRulePredicate', RankRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'weaponRulePredicate', WeaponRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'resourceRulePredicate', ResourceRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'targetingRulePredicate', TargetingRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'traitsRulePredicate', TraitsRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'spellRulePredicate', SpellRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'checkRulePredicate', CheckRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'flagRulePredicate', FlagRulePredicate);
	RulePredicateRegistry.instance.register(systemId, 'progressTrackRulePredicate', ProgressTrackRulePredicate);
}

/**
 * @param {CombatEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onCombatEvent(e, registerCallback) {
	registerCallback(async (event) => {
		const source = event.combatant ? CharacterInfo.fromCombatant(event.combatant) : null;
		const combatants = event.combatant ? [event.combatant] : event.combatants;
		await evaluate(FUHooks.COMBAT_EVENT, event, source, CharacterInfo.fromCombatants(combatants));
	});
}

/**
 * @param {AttackEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onAttackEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.ATTACK_EVENT, event, event.source, event.targets, event.check);
	});
}

/**
 * @param {DamageEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onDamageEvent(e, registerCallback) {
	registerCallback(async (event) =>
		evaluate(FUHooks.DAMAGE_EVENT, event, event.source, [CharacterInfo.fromActor(event.actor)], {
			renderData: event.renderData,
		}),
	);
}

/**
 * @param {ResourceUpdateEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onResourceEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.RESOURCE_UPDATE, event, event.source, event.targets, {
			renderData: event.renderData,
		});
	});
}

/**
 * @param {SpellEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onSpellEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.SPELL_EVENT, event, event.source, event.targets);
	});
}

/**
 * @param {CalculateDamageEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onCalculateDamageEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.CALCULATE_DAMAGE_EVENT, event, event.source, event.targets, {
			config: event.config,
		});
	});
}

/**
 * @param {CalculateResourceEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onCalculateResourceEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.CALCULATE_RESOURCE_EVENT, event, event.source, event.targets, {
			config: event.config,
		});
	});
}

/**
 * @param {CalculateExpenseEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onCalculateExpenseEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.CALCULATE_EXPENSE_EVENT, event, event.source, event.targets);
	});
}

/**
 * @param {StatusEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onStatusEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.STATUS_EVENT, event, event.source, [event.source]);
	});
}

/**
 * @param {CreateConsumableEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onCreateConsumableEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.CONSUMABLE_CREATE_EVENT, event, event.source, event.targets);
	});
}

/**
 * @param {ItemRollEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onItemRoll(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.ITEM_ROLL_EVENT, event, event.source, []);
	});
}

/**
 * @param {InitializeCheckEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onInitializeCheckEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.INITIALIZE_CHECK_EVENT, event, event.source, event.targets, {
			check: event.config.check,
			config: event.config,
		});
	});
}

/**
 * @param {PerformCheckEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onPerformCheckEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.PERFORM_CHECK_EVENT, event, event.source, event.targets, {
			check: event.check,
			config: event.config,
		});
	});
}

/**
 * @param {ResolveCheckEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onResolveCheckEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.RESOLVE_CHECK_EVENT, event, event.source, event.targets, {
			check: event.check,
		});
	});
}

/**
 * @param {RenderCheckEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onRenderCheckEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.RENDER_CHECK_EVENT, event, event.source, event.targets, {
			check: event.check,
			config: event.config,
			renderData: event.renderData,
		});
	});
}

/**
 * @param {RenderMessageEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onRenderMessageEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.RENDER_MESSAGE_EVENT, event, event.source, [], {
			renderData: event.renderData,
		});
	});
}

/**
 * @param {NotificationEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onNotificationEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.NOTIFICATION_EVENT, event, event.source, [event.source]);
	});
}

/**
 * @param {NotificationEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onEffectToggledEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.EFFECT_TOGGLED_EVENT, event, event.source, []);
	});
}

/**
 * @param {FeatureEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onFeatureEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.FEATURE_EVENT, event, event.source, event.targets, {
			renderData: event.renderData,
		});
	});
}

/**
 * @param {ProgressEvent} e
 * @param {RegisterCallback} registerCallback
 */
function onProgressEvent(e, registerCallback) {
	registerCallback(async (event) => {
		await evaluate(FUHooks.PROGRESS_EVENT, event, event.source, [], {
			renderData: event.renderData,
		});
	});
}

/**
 * @param {CharacterInfo[]} targets
 * @returns {CharacterInfo[]}
 */
function getSceneCharacters(targets) {
	/** @type CharacterInfo[] **/
	let sceneCharacters = [];
	sceneCharacters.push(...targets);

	if (FUCombat.hasActiveEncounter) {
		/** @type FUCombatant[] **/
		const combatants = Array.from(FUCombat.activeEncounter.combatants.values());
		const combatCharacters = CharacterInfo.fromCombatants(combatants);
		sceneCharacters.push(...combatCharacters);
	}

	return [...new Map(sceneCharacters.filter((ci) => ci.actor?.uuid).map((ci) => [ci.actor.uuid, ci])).values()];
}

/**
 * @param {ActiveEffect|FUActiveEffect} effect
 * @returns {boolean}
 */
function canProcessEffect(effect) {
	const disabled = effect.isSuppressed || effect.disabled;
	if (disabled || effect.system.rules.elements.size === 0) {
		return false;
	}
	return true;
}

/**
 * @type {Set<string>} Events that can possibly have no source character.
 */
const eventsWithoutSourceCharacter = new Set([FUHooks.COMBAT_EVENT]);

/**
 * @param {String} type
 * @param {*} event
 * @param {CharacterInfo} source
 * @param {CharacterInfo[]} targets
 * @param {RuleElementContext} data Properties for the rule element context.
 * @return {Promise<void>}
 */
async function evaluate(type, event, source, targets, data = undefined) {
	// This can happen when sending items to chat.
	if (!source) {
		// But some events
		if (!eventsWithoutSourceCharacter.has(type)) {
			return;
		}
	}
	// Always include the source as part of the scene character pool; useful for when they are not part of the encounter
	const sceneCharacters = getSceneCharacters(source ? [source, ...targets] : targets);
	for (const character of sceneCharacters) {
		for (const effect of character.actor.allApplicableEffects()) {
			if (!canProcessEffect(effect)) {
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
			// If this effect was attached on an item (best case)
			if (effect.parent.documentName === 'Item') {
				contextData.item = effect.parent;
			}
			// If not, we will use a dummy item
			else {
				contextData.item = new FUItem({
					name: effect.name,
					img: effect.img,
					type: 'rule',
				});
			}
			const context = new RuleElementContext(contextData);

			for (const element of Object.values(effect.system.rules.elements)) {
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
	Hooks.on(FUHooks.EFFECT_TOGGLED_EVENT, onEffectToggledEvent);
	Hooks.on(FUHooks.CALCULATE_DAMAGE_EVENT, onCalculateDamageEvent);
	Hooks.on(FUHooks.CALCULATE_RESOURCE_EVENT, onCalculateResourceEvent);
	Hooks.on(FUHooks.CALCULATE_EXPENSE_EVENT, onCalculateExpenseEvent);
	Hooks.on(FUHooks.RENDER_CHECK_EVENT, onRenderCheckEvent);
	Hooks.on(FUHooks.INITIALIZE_CHECK_EVENT, onInitializeCheckEvent);
	Hooks.on(FUHooks.CONSUMABLE_CREATE_EVENT, onCreateConsumableEvent);
	Hooks.on(FUHooks.ITEM_ROLL_EVENT, onItemRoll);
	Hooks.on(FUHooks.FEATURE_EVENT, onFeatureEvent);
	Hooks.on(FUHooks.RENDER_MESSAGE_EVENT, onRenderMessageEvent);
	Hooks.on(FUHooks.PROGRESS_EVENT, onProgressEvent);
}

export const RuleElements = Object.freeze({
	register,
	initialize,
});
