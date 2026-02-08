import { FUActor } from '../documents/actors/actor.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { FUHooks } from '../hooks.mjs';
import { Pipeline } from './pipeline.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { CommonEvents } from '../checks/common-events.mjs';
import { SETTINGS } from '../settings.js';
import { MathHelper } from '../helpers/math-helper.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { statusEffects } from '../documents/effects/statuses.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';
import { CompendiumIndex } from '../ui/compendium/compendium-index.mjs';

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
 * @typedef ApplyEffectData
 * @property {String[]} entries
 */

/**
 * @param {Actor|Item} owner The owning document which manages this effect
 * @param {String} effectType
 * @param {String} name
 * @returns {*}
 * @remarks Effects created this way will by default be removed at the end of the scene
 */
function createTemporaryEffect(owner, effectType, name = undefined) {
	const system = {
		duration: {
			event: effectType === 'passive' ? 'none' : 'endOfScene',
		},
	};
	return owner.createEmbeddedDocuments('ActiveEffect', [
		{
			name: name ?? (owner instanceof FUItem ? owner.name : game.i18n.localize('FU.NewEffect')),
			img: 'icons/svg/aura.svg',
			source: owner.uuid,
			system: system,
			'duration.rounds': effectType === 'temporary' ? 1 : undefined,
			disabled: effectType === 'inactive',
		},
	]);
}

/**
 * @param {String} id
 * @return {ActiveEffectData}
 */
function resolveBaseEffect(id) {
	return statusEffects.find((value) => value.id === id);
}

/** *
 * @param {String} id An uuid or fuid
 * @returns {Promise<ActiveEffectData>}
 */
async function getEffectData(id) {
	let effect;
	// Resolve by status id
	if (id in Effects.STATUS_EFFECTS || id in Effects.BOONS_AND_BANES) {
		effect = statusEffects.find((value) => value.id === id);
	} else {
		// Resolve by uuid
		if (FoundryUtils.isUUID(id)) {
			effect = await fromUuid(id);
		}
		// Resolve by fuid
		else {
			const entry = await CompendiumIndex.instance.getItemByFuid(id);
			if (entry) {
				effect = await fromUuid(entry.uuid);
			}
		}
		// Get the first AE attached to the item
		if (effect && effect instanceof FUItem) {
			effect = effect.effects.entries().next().value[1];
		}
	}
	if (!effect) {
		console.error(`No effect with id '${id}' could be resolved.`);
	}
	return effect;
}

/**
 * Manage Active Effect instances through the Actor Sheet via effect control buttons.
 * @param {PointerEvent} event     The left-click event on the effect control
 * @param {Actor|Item} owner       The owning document which manages this effect
 * @param {string} action          The action to be performed, where data-action might differ
 */
export async function onManageActiveEffect(event, owner, action) {
	event.preventDefault();
	const actionElement = event.target.closest('[data-action]');
	const effectIdElement = event.target.closest('[data-effect-id]');

	/**
	 * @returns {FUActiveEffect}
	 */
	const resolveEffect = () => {
		const effectId = effectIdElement.dataset.effectId;
		let effect;
		// We check allEffects in order to get effects from the ITEMS as well
		if (owner instanceof FUActor) {
			effect = owner.getEffect(effectId);
		} else {
			effect = owner.effects.get(effectId);
		}
		return effect;
	};

	switch (action ?? actionElement.dataset.action) {
		case 'create':
			return createTemporaryEffect(owner, actionElement.dataset.effectType);
		case 'edit': {
			const effect = resolveEffect();
			return effect.sheet.render(true, { editable: owner === effect.parent });
		}
		case 'delete': {
			const _effect = resolveEffect();
			if (canBeRemoved(_effect)) {
				const title = StringUtils.localize('FU.DialogDeleteItemTitle', { item: _effect.name });
				const content = StringUtils.localize('FU.DialogDeleteItemDescription', { item: _effect.name });
				const confirm = await FoundryUtils.confirmDialog(title, content);
				if (confirm) {
					sendToChatEffectRemoved(_effect, owner);
					return _effect.delete();
				}
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
	const list = ['crisis', 'ko'];
	for (const el of list) {
		if (effect.statuses.has(el)) {
			return false;
		}
	}
	return true;
}

/**
 * @param effect
 * @returns {boolean} True if the effect can be mentioned in chat messages.
 */
function isVerbose(effect) {
	const list = ['crisis', 'ko', 'pressure', 'stagger'];
	for (const el of list) {
		if (effect.statuses.has(el)) {
			return false;
		}
	}
	return true;
}

// Helper function to generate the @EFFECT format string
function formatEffect(effect) {
	const encodedEffect = StringUtils.toBase64(effect.toJSON());
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
 * @param {String} id
 * @returns {boolean}
 */
function isStatusEffect(id) {
	return id in Effects.STATUS_EFFECTS || id in Effects.BOONS_AND_BANES;
}

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
		const statusEffect = resolveBaseEffect(statusEffectId);
		if (statusEffect) {
			const instance = await ActiveEffect.create(
				{
					...statusEffect,
					statuses: [statusEffectId],
					flags: createEffectFlags(statusEffect, sourceInfo, statusEffectId),
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

/**
 * @param {FUActor|FUItem} document
 * @param {ActiveEffectData} effect
 * @param {InlineSourceInfo} sourceInfo
 * @param {InlineEffectConfiguration} config
 * @returns {FUActiveEffect}
 */
async function applyEffect(document, effect, sourceInfo, config = undefined) {
	if (document) {
		if (document instanceof FUActor && !document.isCharacterType) {
			ui.notifications.error(`FU.ActorSheetEffectNotSupported`, { localize: true });
			return;
		}
		const flags = createEffectFlags(effect, sourceInfo, sourceInfo?.fuid);
		const instance = await ActiveEffect.create(
			{
				...effect,
				flags: flags,
			},
			{ parent: document },
		);
		await applyConfiguration(instance, config);
		await sendToChatEffectAdded(instance, document, sourceInfo?.name);
		return instance;
	}
}

/**
 * @param {FUActor|FUItem} document
 * @param {InlineSourceInfo} source
 * @param {FUActiveEffect} effect
 */
function removeEffect(document, source, effect) {
	if (!document) return;

	const existingEffect = document.effects.find(
		(e) =>
			e.getFlag(SYSTEM, Flags.ActiveEffect.Temporary) &&
			e.sourceItem === source &&
			e.changes.length === effect.changes.length &&
			e.changes.every((change, index) => change.key === effect.changes[index].key && change.mode === effect.changes[index].mode && change.value === effect.changes[index].value),
	);

	if (existingEffect) {
		sendToChatEffectRemoved(effect, document);
		existingEffect.delete();
	} else {
		console.log('No matching effect found to remove.');
	}
}

/**
 * @param {FUActiveEffect} effect
 * @param {FUActor|FUItem} document
 * @param {String} source
 * @returns {Promise<void>}
 */
async function sendToChatEffectAdded(effect, document, source) {
	console.info(`Added effect: ${effect.uuid} on actor uuid: ${document.uuid}`);
	if (game.combat && isVerbose(effect)) {
		await ChatMessage.create({
			flags: Pipeline.initializedFlags(Flags.ChatMessage.Effects, true),
			content: await FoundryUtils.renderTemplate('chat/chat-apply-effect', {
				message: 'FU.ChatApplyEffect',
				document: document,
				effect: effect,
				source: source,
			}),
			speaker: ChatMessage.getSpeaker({ actor: document }),
		});
	}
}

function sendToChatEffectRemoved(effect, actor) {
	console.log(`Removing effect: ${effect.name} from actor ${actor.uuid}`);
	if (game.combat && isVerbose(effect)) {
		ChatMessage.create({
			flags: Pipeline.initializedFlags(Flags.ChatMessage.Effects, true),
			content: game.i18n.format('FU.EffectRemoveMessage', {
				effect: effect.name,
				actor: actor.name,
			}),
			speaker: ChatMessage.getSpeaker({ actor }),
		});
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
 * @param {String} identifier An unique identifier for the effect
 * @returns {Object}
 */
function createEffectFlags(effect, sourceInfo, identifier) {
	return foundry.utils.mergeObject(effect.flags ?? {}, {
		[SYSTEM]: {
			[Flags.ActiveEffect.Temporary]: true,
			[Flags.ActiveEffect.Source]: sourceInfo,
			[Flags.ActiveEffect.Identifier]: identifier,
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

	if (game.settings.get(SYSTEM, SETTINGS.optionAutomationRemoveExpiredEffects)) {
		event.actors.forEach((actor) => {
			actor.clearTemporaryEffects({
				duration: true,
			});
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
 * @param {FUActor} actor
 * @param {FUActor[]} targets
 * @param {FUActiveEffect[]} effects
 * @param {InlineSourceInfo} sourceInfo
 * @returns {Promise<void>}
 */
async function promptApplyEffect(actor, targets, effects, sourceInfo) {
	let actions = await Promise.all(effects.map((effect) => getTargetedAction(effect.uuid ?? effect.id, sourceInfo)));
	actions = actions.filter((a) => a !== null);
	let flags = Pipeline.initializedFlags(Flags.ChatMessage.Targets, true);
	flags = Pipeline.setFlag(flags, Flags.ChatMessage.Effects, true);
	const targetData = Targeting.serializeTargetData(targets);

	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor: actor }),
		flags: flags,
		content: await FoundryUtils.renderTemplate('chat/chat-apply-effect-prompt', {
			actor: actor,
			source: sourceInfo.name,
			effects: effects,
			actions: actions,
			targets: targetData,
			fields: StringUtils.toBase64({
				sourceInfo: sourceInfo,
			}),
		}),
	});
}

async function promptRemoveEffect(actor, source) {
	const tempEffects = actor.temporaryEffects;
	if (tempEffects.length === 0) {
		return;
	}
	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor: actor }),
		flags: Pipeline.initializedFlags(Flags.ChatMessage.Effects, true),
		content: await FoundryUtils.renderTemplate('chat/chat-remove-effect-prompt', {
			actor: actor,
			source: source,
			effects: tempEffects,
		}),
	});
}

/**
 * @param {String} id An uuid or fuid.
 * @param {InlineSourceInfo} sourceInfo
 * @returns {Promise<ChatAction>}
 */
async function getTargetedAction(id, sourceInfo) {
	let name;
	let icon;
	let img;
	const effectData = await getEffectData(id);
	if (effectData) {
		if (effectData.img) {
			img = effectData.img;
		} else {
			if (resolveBaseEffect(id)) {
				icon = `fuk fu-${id}`;
			} else {
				icon = 'ra ra-biohazard';
			}
		}
		name = StringUtils.localize(effectData.name);
	} else {
		return null;
	}

	const tooltip = StringUtils.localize('FU.ChatApplyEffectHint', {
		effect: name,
	});
	const label = StringUtils.localize('FU.ChatApplyEffectLabel', {
		effect: name,
	});

	return new ChatAction('applyEffect', icon, tooltip, {
		sourceInfo: sourceInfo,
	})
		.requiresOwner()
		.setFlag(Flags.ChatMessage.Effects)
		.withSelected()
		.withLabel(label)
		.withImage(img)
		.withDataset({
			['effect-id']: id,
		});
}

/**
 * @param {String} id An uuid or fuid.
 * @param {InlineSourceInfo} sourceInfo
 * @returns {Promise<ChatAction>}
 */
async function getClearAction(id, sourceInfo) {
	let name;
	let icon;
	let img;

	// Clear a single effect
	if (id) {
		const effectData = await getEffectData(id);
		if (effectData) {
			if (effectData.img) {
				img = effectData.img;
			} else {
				if (resolveBaseEffect(id)) {
					icon = `fuk fu-${id}`;
				} else {
					icon = 'ra ra-biohazard';
				}
			}
			name = StringUtils.localize(effectData.name);
		}
	}
	// Clear status effects
	else {
		name = `${StringUtils.localize('FU.All')} ${StringUtils.localize('FU.StatusEffect')}`;
		icon = 'ra ra-biohazard';
	}

	const tooltip = StringUtils.localize('FU.ChatClearEffectLabel', {
		effect: name,
	});
	const label = StringUtils.localize('FU.ChatClearEffectLabel', {
		effect: name,
	});

	return new ChatAction('clearEffect', icon, tooltip, {
		sourceInfo: sourceInfo,
	})
		.requiresOwner()
		.setFlag(Flags.ChatMessage.Effects)
		.withSelected()
		.withLabel(label)
		.withClasses('fu-chat__clear-effect')
		.withImage(img)
		.withDataset({
			['effect-id']: id,
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

	Pipeline.handleClickRevert(message, element, 'removeEffect', (dataset) => {
		const actorId = dataset.actorId;
		const effectId = dataset.id;
		console.debug(`Removing effect ${effectId} from ${actorId}`);
		/** @type FUActor **/
		const actor = fromUuidSync(actorId);
		const effect = actor.effects.get(effectId);
		if (effect) {
			effect.delete();
		}
	});

	Pipeline.handleClick(message, element, 'applyEffect', async (dataset) => {
		const effectId = dataset.effectId;
		const isStatus = isStatusEffect(effectId);

		let sourceInfo = InlineSourceInfo.none;
		if (dataset.fields) {
			const fields = StringUtils.fromBase64(dataset.fields);
			if (fields.sourceInfo) {
				sourceInfo = InlineSourceInfo.fromObject(fields.sourceInfo);
			}
		}

		const targets = await Pipeline.getTargetsFromAction(dataset);
		console.debug(`Applying effect ${effectId} to ${targets}`);
		if (isStatus) {
			for (const target of targets) {
				if (!target.isOwner) {
					ui.notifications.warn('FU.ChatActorOwnershipWarning', { localize: true });
					continue;
				}
				await toggleStatusEffect(target, effectId, sourceInfo);
			}
		} else {
			const effect = await getEffectData(effectId);
			if (!effect) {
				return;
			}
			for (const target of targets) {
				if (!target.isOwner) {
					ui.notifications.warn('FU.ChatActorOwnershipWarning', { localize: true });
					continue;
				}
				await applyEffect(target, effect, sourceInfo);
			}
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

	Pipeline.handleClick(message, element, 'clearEffect', async (dataset) => {
		const effectId = dataset.effectId;
		const targets = await Pipeline.getTargetsFromAction(dataset);
		targets.forEach((actor) => {
			if (!actor.isOwner) {
				ui.notifications.warn('FU.ChatActorOwnershipWarning', { localize: true });
				return;
			}
			if (effectId) {
				const effect = actor.resolveEffect(effectId);
				if (effect) {
					effect.delete();
				}
			} else {
				actor.clearTemporaryEffects({
					status: true,
				});
			}
		});
	});

	Pipeline.handleClick(message, element, 'clearEffects', (dataset) => {
		const actors = Targeting.deserializeTargetData(dataset.actors);
		actors.forEach((actor) => {
			if (!actor.isOwner) {
				ui.notifications.warn('FU.ChatActorOwnershipWarning', { localize: true });
				return;
			}
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
			await promptExpiredEffectRemoval(event);
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
	event.actor.clearTemporaryEffects({
		duration: true,
	});
}

const BOONS_AND_BANES = Object.freeze(
	Object.fromEntries(
		['dex-up', 'ins-up', 'mig-up', 'wlp-up', 'dex-down', 'ins-down', 'mig-down', 'wlp-down', 'guard', 'cover', 'aura', 'barrier', 'flying', 'provoked', 'focus', 'pressure', 'stagger'].map((value) => [value, FU.statusEffects[value]]),
	),
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
	getEffectData,
	removeEffect,
	applyEffect,
	canBeRemoved,
	isStatusEffect,
	toggleStatusEffect,
	createTemporaryEffect,
	formatEffect,
	sendToChatEffectAdded,
	promptRemoveEffect,
	promptApplyEffect,
	getTargetedAction,
	getClearAction,
	createEffectFlags,

	BOONS_AND_BANES,
	DAMAGE_TYPES,
	STATUS_EFFECTS,
});
