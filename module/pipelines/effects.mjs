import { FUActor } from '../documents/actors/actor.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { FUActiveEffect } from '../documents/effects/active-effect.mjs';
import { InlineHelper } from '../helpers/inline-helper.mjs';
import { FUHooks } from '../hooks.mjs';
import { Pipeline } from './pipeline.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { CommonEvents } from '../checks/common-events.mjs';
import { SETTINGS } from '../settings.js';
import { MathHelper } from '../helpers/math-helper.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';

/**
 * @typedef EffectChangeData
 * @property {String} key The attribute path in the Actor or Item data which the change modifies
 * @property {String} value The value of the change effect
 * @property {Number} mode The modification mode with which the change is applied
 * @property {Number} priority The priority level with which this change is applied
 * @remarks https://foundryvtt.com/api/interfaces/foundry.types.EffectChangeData.html
 */

/**
 * @typedef EffectDurationData
 * @property {String} combat The _id of the CombatEncounter in which the effect first started
 * @property {Number} rounds The maximum duration of the effect, in combat rounds
 * @property {Number} turns The maximum duration of the effect, in combat turns
 * @property {Number} startRound The round of the CombatEncounter in which the effect first started
 * @property {Number} startTurn The turn of the CombatEncounter in which the effect first started
 */

/**
 * @typedef {Object} ActiveEffectData
 * @property {string} _id The unique identifier of the active effect.
 * @property {string} name - The name of the which describes the name of the ActiveEffect
 * @property {string} img - An image path used to 3depict the ActiveEffect as an icon
 * @property {EffectChangeData[]} changes - The array of EffectChangeData objects which the ActiveEffect applies
 * @property {boolean} disabled - Whether the active effect is disabled.
 * @property {EffectDurationData} duration - The duration data of the active effect.
 * @property {string} description - The description of the active effect.
 * @property {string} origin - A UUID reference to the document from which this ActiveEffect originated
 * @property {string} tint - A color string which applies a tint to the ActiveEffect icon
 * @property {Boolean} transfer - Does this ActiveEffect automatically transfer from an Item to an Actor?
 * @property {Set<string>} statuses - Special status IDs that pertain to this effect
 * @property {Object} flags - An object of optional key/value flags
 * @remarks https://foundryvtt.com/api/interfaces/foundry.types.ActiveEffectData.html
 */

/**
 * @param {Actor|Item} owner The owning document which manages this effect
 * @param {String} effectType
 * @param {String} name
 * @returns {*}
 * @remarks Effects created this way will by default be removed at the end of the scene
 */
function createTemporaryEffect(owner, effectType, name) {
	const system = {
		duration: {
			event: effectType === 'passive' ? 'none' : 'endOfScene',
		},
	};
	return owner.createEmbeddedDocuments('ActiveEffect', [
		{
			name: name ?? game.i18n.localize('FU.NewEffect'),
			img: 'icons/svg/aura.svg',
			source: owner.uuid,
			system: system,
			'duration.rounds': effectType === 'temporary' ? 1 : undefined,
			disabled: effectType === 'inactive',
		},
	]);
}

/**
 * Manage Active Effect instances through the Actor Sheet via effect control buttons.
 * @param {PointerEvent} event     The left-click event on the effect control
 * @param {Actor|Item} owner       The owning document which manages this effect
 * @param {string} action          The action to be performed, where data-action might differ
 */
export async function onManageActiveEffect(event, owner, action) {
	event.preventDefault();
	const anchor = HTMLUtils.findWithDataset(event.target);
	const listItem = anchor.closest('li');

	/**
	 * @returns {FUActiveEffect}
	 */
	const resolveEffect = () => {
		const effectId = listItem.dataset.effectId;
		let effect;
		// We check allEffects in order to get effects from the ITEMS as well
		if (owner instanceof FUActor) {
			effect = Array.from(owner.allEffects()).find((value) => value.id === effectId);
		} else {
			effect = owner.effects.get(effectId);
		}
		return effect;
	};

	switch (action ?? anchor.dataset.action) {
		case 'create':
			return createTemporaryEffect(owner, listItem.dataset.effectType);
		case 'edit':
			return resolveEffect().sheet.render(true);
		case 'delete': {
			const _effect = resolveEffect();
			if (canBeRemoved(_effect)) {
				sendToChatEffectRemoved(_effect, owner);
				return _effect.delete();
			}
			break;
		}
		case 'toggle': {
			const effect = resolveEffect();
			return effect.update({ disabled: !effect.disabled });
		}
		case 'copy-inline': {
			await handleCopyInlineEffect(resolveEffect());
			break;
		}
		case 'roll': {
			return await renderEffect(resolveEffect(), owner);
		}

		case 'incrementProgress': {
			const effect = resolveEffect();
			const progress = effect.system.rules.progress;
			const current = MathHelper.clamp(progress.current + progress.step, 0, progress.max);
			return effect.update({ 'system.rules.progress.current': current });
		}

		case 'decrementProgress': {
			const effect = resolveEffect();
			const progress = effect.system.rules.progress;
			const current = MathHelper.clamp(progress.current - progress.step, 0, progress.max);
			return effect.update({ 'system.rules.progress.current': current });
		}
	}
}

/**
 * @typedef EffectCategories
 * @property temporary
 * @property passive
 * @property inactive
 */

/**
 * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
 * @param {ActiveEffect[]} effects    The array of Active Effect instances to prepare sheet data for
 * @return {object}                   Data for rendering
 */
export function prepareActiveEffectCategories(effects) {
	// Define effect header categories
	const categories = {
		temporary: {
			type: 'temporary',
			label: game.i18n.localize('FU.TemporaryEffects'),
			effects: [],
		},
		passive: {
			type: 'passive',
			label: game.i18n.localize('FU.PassiveEffects'),
			effects: [],
		},
		inactive: {
			type: 'inactive',
			label: game.i18n.localize('FU.InactiveEffects'),
			effects: [],
		},
	};

	// Iterate over active effects, classifying them into categories
	for (let e of effects) {
		if (e.disabled) categories.inactive.effects.push(e);
		else if (e.isTemporary) categories.temporary.effects.push(e);
		else categories.passive.effects.push(e);
	}
	return categories;
}

/**
 * @param effect
 * @returns {boolean} True if the effect can only be managed by the system
 */
function canBeRemoved(effect) {
	return !effect.statuses.has('crisis') && !effect.statuses.has('ko');
}

// Helper function to generate the @EFFECT format string
function formatEffect(effect) {
	const encodedEffect = InlineHelper.toBase64(effect.toJSON());
	return `@EFFECT[${encodedEffect}]`;
}

/**
 * Generate encoded effect and copy to clipboard.
 * @param {ActiveEffect} effect - The ActiveEffect to encode and copy
 */
export async function handleCopyInlineEffect(effect) {
	try {
		const encodedEffect = formatEffect(effect);

		await navigator.clipboard.writeText(encodedEffect);

		if (ui && ui.notifications) {
			ui.notifications.info('Inline effect copied to clipboard.');
		}
	} catch (error) {
		console.error('Failed to copy effect to clipboard:', error);
	}
}

export function isActiveEffectForStatusEffectId(effect, statusEffectId) {
	return effect.statuses.has(statusEffectId);
}

/**
 * @description Handle renders the effect by creating a chat message.
 * @param {ActiveEffect} effect  The ActiveEffect to be rolled and encoded
 * @param {Actor|Item} owner     The owning document (actor or item)
 */
async function renderEffect(effect, owner) {
	if (!effect) {
		ui.notifications.error('Effect not found.');
		return;
	}
	await effect.sendToChat();
}

/**
 * @typedef InlineEffectConfiguration
 * @property {String} name
 * @property {String} event e:
 * @property {Number} interval i:
 * @property {String} tracking t:
 */

/**
 * A helper function to toggle a status effect on an Actor.
 * Designed based off TokenDocument#toggleActiveEffect to properly interact with token hud.
 * @param {FUActor} actor the actor the status should get applied to
 * @param {string} statusEffectId The status effect id based on CONFIG.statusEffects
 * @param {InlineSourceInfo} sourceInfo
 * @param {InlineEffectConfiguration} config
 * @returns {Promise<boolean>} Whether the ActiveEffect is now on or off
 */
export async function toggleStatusEffect(actor, statusEffectId, sourceInfo = undefined, config = undefined) {
	if (!actor.isCharacterType) {
		ui.notifications.error(`FU.ActorSheetEffectNotSupported`, { localize: true });
		return false;
	}
	const existing = actor.effects.filter((effect) => isActiveEffectForStatusEffectId(effect, statusEffectId));
	if (existing.length > 0) {
		await Promise.all(
			existing.map((e) => {
				CommonEvents.status(actor, statusEffectId, false);
				sendToChatEffectRemoved(e, actor);
				return e.delete();
			}),
		);
		return false;
	} else {
		const statusEffect = CONFIG.statusEffects.find((e) => e.id === statusEffectId);
		if (statusEffect) {
			const instance = await ActiveEffect.create(
				{
					...statusEffect,
					statuses: [statusEffectId],
					flags: createEffectFlags(statusEffect, sourceInfo),
				},
				{ parent: actor },
			);
			await applyConfiguration(instance, config);
			CommonEvents.status(actor, statusEffectId, true);
		}
		return true;
	}
}

/**
 * Disable a status effect on an Actor, if it's currently active.
 * @param {FUActor} actor - The actor from which to remove the status effect.
 * @param {string} statusEffectId - The effect ID from CONFIG.statusEffects.
 * @returns {Promise<boolean>} - Whether the effect was removed.
 */
export async function disableStatusEffect(actor, statusEffectId) {
	if (!actor.isCharacterType) {
		ui.notifications.error(`FU.ActorSheetEffectNotSupported`, { localize: true });
		return false;
	}
	const existing = actor.effects.filter((effect) => isActiveEffectForStatusEffectId(effect, statusEffectId));
	if (existing.length > 0) {
		await Promise.all(
			existing.map((e) => {
				CommonEvents.status(actor, statusEffectId, false);
				sendToChatEffectRemoved(e, actor);
				return e.delete();
			}),
		);
		return true;
	}
	return false;
}

function sendToChatEffectRemoved(effect, actor) {
	console.log(`Removing effect: ${effect.name}`);
	// TODO: Implement alongside message window
	if (game.combat) {
		ChatMessage.create({
			content: game.i18n.format('FU.EffectRemoveMessage', {
				effect: effect.name,
				actor: actor.name,
			}),
			speaker: ChatMessage.getSpeaker({ actor }),
		});
	}
}

/**
 * @param {FUActor|FUItem} target
 * @param {ActiveEffectData} effect
 * @param {InlineSourceInfo} sourceInfo
 * @param {InlineEffectConfiguration} config
 * @returns {FUActiveEffect}
 */
async function onApplyEffect(target, effect, sourceInfo, config = undefined) {
	if (target) {
		if (target instanceof FUActor && !target.isCharacterType) {
			ui.notifications.error(`FU.ActorSheetEffectNotSupported`, { localize: true });
			return;
		}
		const flags = createEffectFlags(effect, sourceInfo);
		const instance = await ActiveEffect.create(
			{
				...effect,
				flags: flags,
			},
			{ parent: target },
		);
		await applyConfiguration(instance, config);
		return instance;
	}
}

/**
 * @param {FUActor} actor
 * @param source
 * @param {FUActiveEffect} effect
 */
function onRemoveEffectFromActor(actor, source, effect) {
	if (!actor) return;

	const existingEffect = actor.effects.find(
		(e) =>
			e.getFlag(SYSTEM, FUActiveEffect.TEMPORARY_FLAG) &&
			e.source === source &&
			e.changes.length === effect.changes.length &&
			e.changes.every((change, index) => change.key === effect.changes[index].key && change.mode === effect.changes[index].mode && change.value === effect.changes[index].value),
	);

	if (existingEffect) {
		sendToChatEffectRemoved(effect, actor);
		existingEffect.delete();
	} else {
		console.log('No matching effect found to remove.');
	}
}

/**
 * @param {FUActiveEffect} effect
 * @param {InlineEffectConfiguration} configuration
 * @returns {Promise<void>}
 */
async function applyConfiguration(effect, configuration) {
	if (!configuration) {
		return;
	}
	const updates = {};
	if (configuration.name) {
		updates['name'] = configuration.name;
	}
	if (configuration.event) {
		updates['system.duration.event'] = configuration.event;
	}
	if (configuration.interval) {
		updates['system.duration.interval'] = configuration.interval;
		updates[`system.duration.remaining`] = configuration.interval;
	}
	if (configuration.tracking) {
		updates['system.duration.tracking'] = configuration.tracking;
	}
	if (Object.keys(updates).length > 0) {
		effect.update(updates);
	}
}

/**
 * @param {ActiveEffectData} effect
 * @param {InlineSourceInfo} sourceInfo
 * @returns {Object}
 */
function createEffectFlags(effect, sourceInfo) {
	return foundry.utils.mergeObject(effect.flags ?? {}, {
		[SYSTEM]: {
			[FUActiveEffect.TEMPORARY_FLAG]: true,
			[Flags.ActiveEffect.Source]: sourceInfo,
		},
	});
}

/**
 * @typedef ManagedEffectData
 * @property {String} name
 * @property {String} img
 * @property {String} id
 * @property {String} actorName
 * @property {String} actorId
 * @property {Number} remaining
 * @property {String} description
 */

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
						if (effect.source.actorUuid !== event.actor.uuid) {
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
async function promptEffectRemoval(event) {
	let count = 0;
	if (
		event.actors.every((actor) => {
			count += actor.temporaryEffects.length;
			return actor.temporaryEffects.length === 0;
		})
	) {
		return;
	}

	if (game.settings.get(SYSTEM, SETTINGS.optionAutomationRemoveExpiredEffects)) {
		event.actors.forEach((actor) => {
			actor.clearTemporaryEffects(false, false);
		});
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
 * @param {Document} message
 * @param {HTMLElement} element
 */
function onRenderChatMessage(message, element) {
	if (!message.getFlag(SYSTEM, Flags.ChatMessage.Effects)) {
		return;
	}

	Pipeline.handleClick(message, element, 'removeEffect', (dataset) => {
		const effectId = dataset.id;
		const actorId = dataset.actorId;
		console.debug(`Removing effect ${effectId} on ${actorId}`);
		/** @type FUActor **/
		const actor = fromUuidSync(actorId);
		// TODO: Add revert-like behaviour
		const effect = actor.effects.get(effectId);
		if (effect) {
			effect.delete();
		}
	});

	Pipeline.handleClick(message, element, 'display', async (dataset) => {
		const description = dataset.description;
		const actorId = dataset.actorId;
		const actor = fromUuidSync(actorId);
		await ChatMessage.create({
			content: description,
			speaker: ChatMessage.getSpeaker({ actor: actor }),
		});
	});

	Pipeline.handleClick(message, element, 'clearEffects', (dataset) => {
		const actors = Targeting.deserializeTargetData(dataset.actors);
		actors.forEach((actor) => {
			actor.clearTemporaryEffects();
		});
	});
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
			await promptEffectRemoval(event);
			break;

		case FU.combatEvent.startOfTurn:
		case FU.combatEvent.endOfTurn:
		case FU.combatEvent.endOfRound:
			await manageEffectDuration(event);
			break;
	}
}

/**
 * @param {RestEvent} event
 * @returns {Promise<void>}
 */
async function onRestEvent(event) {
	// Remove statuses and other effects that last until rest
	event.actor.clearTemporaryEffects(true, false);
}

const BOONS_AND_BANES = Object.freeze(
	Object.fromEntries(['dex-up', 'ins-up', 'mig-up', 'wlp-up', 'dex-down', 'ins-down', 'mig-down', 'wlp-down', 'guard', 'cover', 'aura', 'barrier', 'flying', 'provoked'].map((value) => [value, FU.statusEffects[value]])),
);
const DAMAGE_TYPES = Object.freeze((({ untyped, ...rest }) => rest)(FU.damageTypes));
const STATUS_EFFECTS = Object.freeze({ ...FU.temporaryEffects });

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	Hooks.on(FUHooks.COMBAT_EVENT, onCombatEvent);
	Hooks.on(FUHooks.REST_EVENT, onRestEvent);
	Hooks.on('renderChatMessageHTML', onRenderChatMessage);
}

/**
 * @description Contains key functions and properties for dealing with ActiveEffect documents in the system
 */
export const Effects = Object.freeze({
	initialize,
	onRemoveEffectFromActor,
	onApplyEffect,
	onApplyEffectToActor: onApplyEffect,
	canBeRemoved,
	toggleStatusEffect,
	formatEffect,
	BOONS_AND_BANES,
	DAMAGE_TYPES,
	STATUS_EFFECTS,
});
