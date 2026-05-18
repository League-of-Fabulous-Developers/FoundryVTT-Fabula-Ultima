import { AsyncHooks } from '../helpers/async-hooks.mjs';
import { FUHooks } from '../hooks.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { ResourcePipeline, ResourceRequest } from './resource-pipeline.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { Pipeline } from './pipeline.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { Flags } from '../helpers/flags.mjs';

/**
 * @param {CalculateExpenseEvent} event
 * @returns {Promise<void>}
 */
async function onExpenseEvent(event) {
	if (game.settings.get(SYSTEM, SETTINGS.automationSpendResource)) {
		const sourceInfo = InlineSourceInfo.fromInstance(event.source.actor, event.item);
		const request = new ResourceRequest(sourceInfo, [event.source.actor], event.expense.resource, -event.expense.amount);
		return ResourcePipeline.process(request);
	}
}

/**
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function promptExpiredEffectRemoval(event) {
	let count = 0;
	if (
		event.actors.every((actor) => {
			count += actor.temporaryEffects.length;
			return actor.temporaryEffects.length === 0;
		})
	) {
		return;
	}

	let message;
	switch (event.type) {
		case FU.combatEvent.startOfCombat:
			message = 'FU.ChatCombatStart';
			break;
		case FU.combatEvent.endOfCombat:
			message = 'FU.ChatCombatEnd';
			break;
	}

	const serializedActors = Targeting.serializeTargetData(event.actors);
	ChatMessage.create({
		flags: Pipeline.initializedFlags(Flags.ChatMessage.Effects, true),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-combat-end.hbs', {
			message: message,
			actors: JSON.stringify(serializedActors),
			round: event.round,
			count: count,
		}),
	});
}

/**
 * @description Manages active effects during a combat
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function manageEffectDuration(event) {
	console.debug(`Managing active effects on ${event.type}`);

	/** @type ManagedEffectData[] **/
	const managedEffects = [];
	const updates = [];
	const effectsToDelete = [];
	const autoRemove = game.settings.get(SYSTEM, SETTINGS.optionAutomationRemoveExpiredEffects);
	const remind = game.settings.get(SYSTEM, SETTINGS.optionAutomationEffectsReminder);

	// TODO: Add source-tracked effects into a single collection to check
	for (const actor of event.actors) {
		const effects = actor.temporaryEffects.filter(
			/** @type FUActiveEffect **/ (effect) => {
				// The duration data
				const duration = effect.system.duration;
				const eventType = FU.effectDuration[duration.event];

				// Not based on this event type
				if (eventType !== event.type) {
					return false;
				}

				// If the event is based on a specific actor
				if (event.hasActor) {
					if (duration.tracking === 'self') {
						if (actor.uuid !== event.actor.uuid) {
							return false;
						}
					} else if (duration.tracking === 'source') {
						if (effect.sourceInfo.actorUuid !== event.actor.uuid) {
							return false;
						}
					}
				}

				// Already expired
				if (duration.remaining === 0) {
					if (autoRemove) {
						console.debug(`Automatically removing ${effect.name} on round ${event.round}`);
						effectsToDelete.push(effect);
					}
					return true;
				}

				// Tick down remaining
				console.debug(`Decreasing remaining effect duration (${duration.remaining}) of ${effect.name} in ${event.type}`);
				updates.push(
					effect.update({
						[`system.duration.remaining`]: duration.remaining - 1,
					}),
				);

				// Just expired
				const expired = duration.remaining - 1 === 0;
				if (expired) {
					if (autoRemove) {
						console.debug(`Automatically removing ${effect.name}`);
						effectsToDelete.push(effect);
					}
					return true;
				}
				// Not yet expired
				return remind;
			},
		);

		if (effects.length > 0) {
			/** @type ManagedEffectData[] **/
			const effectData = effects.map((effect) => ({
				name: effect.name,
				id: effect.id,
				img: effect.img,
				actorName: actor.name,
				actorId: actor.uuid,
				remaining: effect.system.duration.remaining - 1, // The update happens later okay?
				description: effect.description,
			}));

			managedEffects.push(...effectData);
		}
	}

	if (managedEffects.length === 0) {
		return;
	}
	await Promise.all(updates);

	// TODO: Maybe link to the originals if deletions are about to happen
	ChatMessage.create({
		//speaker: ChatMessage.getSpeaker({ actor }),
		flags: Pipeline.initializedFlags(Flags.ChatMessage.Effects, true),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-manage-effects.hbs', {
			message: 'FU.ChatManageEffects',
			effects: managedEffects,
			round: event.round,
			event: event.type,
		}),
	});

	// Safe to delete now that it's been posted
	for (const e of effectsToDelete) {
		e.delete();
	}
}

/**
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function onCombatEvent(event) {
	if (!game.settings.get(SYSTEM, SETTINGS.optionAutomationManageEffects)) {
		return;
	}

	switch (event.type) {
		case FU.combatEvent.startOfCombat:
		case FU.combatEvent.endOfCombat:
			{
				if (game.settings.get(SYSTEM, SETTINGS.optionAutomationRemoveExpiredEffects)) {
					event.actors.forEach((actor) => {
						actor.clearTemporaryEffects({
							status: false,
							rest: false,
							duration: true,
							predicate: (effect) => {
								// It's handled by the pressure system
								if (effect.statuses.has('pressure')) {
									return false;
								}
								return true;
							},
						});
					});
					return;
				}

				await promptExpiredEffectRemoval(event);
			}
			break;

		case FU.combatEvent.startOfTurn:
		case FU.combatEvent.endOfTurn:
		case FU.combatEvent.endOfRound:
			await manageEffectDuration(event);
			break;
	}
}

function initialize() {
	AsyncHooks.on(FUHooks.EXPENSE_EVENT, onExpenseEvent);
	Hooks.on(FUHooks.COMBAT_EVENT, onCombatEvent);
}

export const AutomationPipeline = Object.freeze({
	initialize,
});
