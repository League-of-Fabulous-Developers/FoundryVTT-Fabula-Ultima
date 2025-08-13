import { FUActor } from '../actors/actor.mjs';
import { FUItem } from '../items/item.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { ExpressionContext, Expressions } from '../../expressions/expressions.mjs';
import { Flags } from '../../helpers/flags.mjs';
import { Pipeline } from '../../pipelines/pipeline.mjs';

const TEMPORARY = 'Temporary';

const PRIORITY_CHANGES = [
	'system.resources.hp.bonus',
	'system.resources.hp.attribute',
	'system.resources.mp.bonus',
	'system.resources.mp.attribute',
	'system.resources.ip.bonus',
	'system.attributes.dex.base',
	'system.attributes.ins.base',
	'system.attributes.mig.base',
	'system.attributes.wlp.base',
	'system.affinities.air.base',
	'system.affinities.bolt.base',
	'system.affinities.dark.base',
	'system.affinities.earth.base',
	'system.affinities.fire.base',
	'system.affinities.ice.base',
	'system.affinities.light.base',
	'system.affinities.physical.base',
	'system.affinities.poison.base',
];

/**
 * @typedef ActiveEffect
 * @property {DataModel} parent
 * @property {Boolean} isSuppressed Is there some system logic that makes this active effect ineligible for application?
 * @property {Document} target Retrieve the Document that this ActiveEffect targets for modification.
 * @property {Boolean} active Whether the Active Effect currently applying its changes to the target.
 * @property {Boolean modifiesActor Does this Active Effect currently modify an Actor?
 * @property {Boolean} isTemporary Describe whether the ActiveEffect has a temporary duration based on combat turns or rounds.
 * @property {Boolean} isEmbedded Test whether this Document is embedded within a parent Document
 * @property {String} id Canonical name
 * @property {String} uuid
 * @property {String} name
 * @property {EffectDurationData} duration
 * @property {EffectChangeData[]} changes - The array of EffectChangeData objects which the ActiveEffect applies
 * @remarks https://foundryvtt.com/api/classes/client.ActiveEffect.html
 * @property {Function<Promise<Document>>} delete Delete this Document, removing it from the database.
 * @property {Function<void>} update Update this Document using incremental data, saving it to the database.
 * @property {Function<String, String, *, void>} setFlag Assign a "flag" to this document. Flags represent key-value type data which can be used to store flexible or arbitrary data required by either the core software, game systems, or user-created modules.
 * @property {Function<String, String, *>} getFlag Get the value of a "flag" for this document See the setFlag method for more details on flags
 */

/**
 * @typedef {EffectDurationData} ActiveEffectDuration
 * @property {string} type            The duration type, either "seconds", "turns", or "none"
 * @property {number|null} duration   The total effect duration, in seconds of world time or as a decimal
 *                                    number with the format {rounds}.{turns}
 * @property {number|null} remaining  The remaining effect duration, in seconds of world time or as a decimal
 *                                    number with the format {rounds}.{turns}
 * @property {string} label           A formatted string label that represents the remaining duration
 * @property {number} [_worldTime]    An internal flag used determine when to recompute seconds-based duration
 * @property {number} [_combatTime]   An internal flag used determine when to recompute turns-based duration
 */

/**
 * @extends ActiveEffect
 * @property {FUActiveEffectModel} system
 * @property {InlineSourceInfo} source
 * @inheritDoc
 * */
export class FUActiveEffect extends ActiveEffect {
	static get TEMPORARY_FLAG() {
		return TEMPORARY;
	}

	static #defaultImage = 'icons/svg/aura.svg';

	/**
	 * @private
	 * @override
	 * @remarks Unlike `_onCreate`, is managed by the GM.
	 */
	async _preCreate(data, options, user) {
		console.debug(`Created active effect ${this.name} on ${this.parent.name ?? 'unknown'} with origin: ${this.origin}, source: ${this.source ? this.source.name : ''}`);
		const changes = {
			name: game.i18n.localize(data.name),
			[`system.duration.remaining`]: this.system.duration.interval,
		};
		// TODO: Verify this is okay

		if (this.parent instanceof Item && this.img === FUActiveEffect.#defaultImage) {
			changes.img = this.parent.img;
		}
		this.updateSource(changes);
		return super._preCreate(data, options, user);
	}

	/**
	 * @override
	 * @returns {Promise<void>}
	 */
	async delete() {
		console.debug(`Deleting active effect ${this.name}`);
		super.delete();
	}

	/**
	 * @returns {InlineSourceInfo} If present, information about the actor/item that was the source of this effect
	 */
	get source() {
		return this.getFlag(Flags.Scope, Flags.ActiveEffect.Source);
	}

	/**
	 * @returns {boolean} True if the effect has a duration that is managed
	 */
	get hasDuration() {
		return this.system.duration.event !== 'none';
	}

	/**
	 * @returns {String}
	 * @remarks Used by the templates
	 */
	get sourceName() {
		if (this.source) {
			return this.source.name;
		}
		return this.parent.name;
	}

	/**
	 * @description Automatically deactivate effects with expired durations
	 * @override
	 * @returns {Boolean}
	 */
	get isSuppressed() {
		// TODO: Refactor, handle other predicates
		if (this.target instanceof FUActor) {
			const flag = this.system.predicate.crisisInteraction;
			if (flag && flag !== 'none') {
				if (this.target.effects.find((e) => e.statuses.has('crisis')) != null) {
					return flag === 'inactive';
				} else {
					return flag === 'active';
				}
			}
		}
		if (this.target instanceof FUItem && this.target.parent instanceof FUActor) {
			const flag = this.system.predicate.crisisInteraction;
			if (flag && flag !== 'none') {
				if (this.target.parent.effects.find((e) => e.statuses.has('crisis')) != null) {
					return flag === 'inactive';
				} else {
					return flag === 'active';
				}
			}
		}
		return false;
	}

	/**
	 * @description Check if the effect's subtype has special handling, otherwise fallback to normal `duration` and `statuses` check
	 * @override
	 */
	get isTemporary() {
		return super.isTemporary || !!this.getFlag(SYSTEM, TEMPORARY) || this.system.duration.event !== 'none';
	}

	/**
	 * @description Compute derived data related to active effect duration.
	 * @returns {{
	 *   type: string,
	 *   duration: number|null,
	 *   remaining: number|null,
	 *   label: string,
	 *   [_worldTime]: number,
	 *   [_combatTime]: number}
	 * }
	 * @private
	 * @override
	 */
	_prepareDuration() {
		// We handle this through the event system
		return {
			type: 'none',
			duration: null,
			remaining: null,
			label: game.i18n.localize('None'),
		};
	}

	/**
	 * @override
	 */
	prepareBaseData() {
		super.prepareBaseData();
		for (let change of this.changes) {
			if (PRIORITY_CHANGES.includes(change.key)) {
				change.priority = change.mode;
			} else {
				change.priority = (change.mode + 1) * 10;
			}
		}
	}

	// TODO: REMOVE ONCE UPGRADED TO V13, WHERE THIS WAS FIXED
	/**
	 * Apply an ActiveEffect that uses an UPGRADE, or DOWNGRADE application mode.
	 * Changes which UPGRADE or DOWNGRADE must be numeric to allow for comparison.
	 * @param {Actor} actor                   The Actor to whom this effect should be applied
	 * @param {EffectChangeData} change       The change data being applied
	 * @param {*} current                     The current value being modified
	 * @param {*} delta                       The parsed value of the change object
	 * @param {object} changes                An object which accumulates changes to be applied
	 * @override
	 */
	_applyUpgrade(actor, change, current, delta, changes) {
		let update;
		const ct = foundry.utils.getType(current);
		switch (ct) {
			case 'boolean':
			case 'number':
				if (change.mode === CONST.ACTIVE_EFFECT_MODES.UPGRADE && delta > current) update = delta;
				else if (change.mode === CONST.ACTIVE_EFFECT_MODES.DOWNGRADE && delta < current) update = delta;
				break;
		}
		if (update !== current && update !== undefined) {
			changes[change.key] = update;
		}
	}

	/**
	 * @param {FUActor|FUItem} target
	 * @param {EffectChangeData} change
	 * @returns {{}|*}
	 */
	apply(target, change) {
		// Support expressions
		if (change.value && typeof change.value === 'string') {
			try {
				// First, evaluate using built-in support
				const expression = Roll.replaceFormulaData(change.value, this.parent);
				// Second, evaluate with our custom expressions
				const context = this.resolveExpressionContext(target);
				const value = Expressions.evaluate(expression, context);
				change.value = String(value ?? 0);
				console.debug(`Assigning ${change.key} (MODE ${change.mode}): ${change.value}`);
			} catch (e) {
				console.error(e);
				ui.notifications?.error(
					game.i18n.format('FU.EffectChangeInvalidFormula', {
						key: change.key,
						effect: this.name,
						target: target.name,
					}),
				);
				return {};
			}
		}

		return super.apply(target, change);
	}

	/**
	 * @description Resolves the context based on the target type
	 * @param {FUActor|FUItem} target
	 * @returns {ExpressionContext}
	 */
	resolveExpressionContext(target) {
		let actor;
		let item;

		// 1. The effect is being applied onto an actor
		// 2. The effect is being applied onto an item
		if (target instanceof FUActor) {
			actor = target;
			if (this.parent instanceof FUItem) {
				item = this.parent;
			}
		} else if (target instanceof FUItem) {
			item = target;
			actor = item.actor;
		}

		const context = new ExpressionContext(actor, item, [target]);
		context.effect = this;
		if (this.source) {
			context.setSourceUuid(this.source.itemUuid);
		}
		return context;
	}

	// TODO: Remove once everyone's migrated
	static CRISIS_INTERACTION = 'CrisisInteraction';
	static EFFECT_TYPE = 'type';
	static migrateData(source) {
		this._addDataFieldMigration(source, `flags.${SYSTEM}.${this.EFFECT_TYPE}`, 'system.type');
		this._addDataFieldMigration(source, `flags.${SYSTEM}.${this.CRISIS_INTERACTION}`, 'system.predicate.crisisInteraction');
		return super.migrateData(source);
	}

	/**
	 * @description Emits a chat message with this effect
	 * @returns {Promise<void>}
	 */
	async sendToChat() {
		// It's okay for it to be empty
		const description = this.description; // ? this.description : game.i18n.localize('FU.NoItem');
		let flags = Pipeline.initializedFlags(Flags.ChatMessage.Effect, this.uuid);

		if (this.parent instanceof FUItem) {
			Pipeline.setFlag(flags, Flags.ChatMessage.Item, this.parent.uuid);
		}

		// TODO: More information?
		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: this.parent }),
			flags: flags,
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-active-effect.hbs', {
				effect: this,
				description: description,
			}),
		});
	}
}

/**
 * @param {FUActor} actor
 * @param {EffectChangeData} change
 * @param current
 */
function onApplyActiveEffect(actor, change, current) {
	if (change.key.startsWith('system.') && current instanceof foundry.abstract.DataModel && Object.hasOwn(current, change.value) && current[change.value] instanceof Function) {
		console.debug(`Applying change ${change.value} to ${change.key}`);
		current[change.value]();
		return false;
	}
}
Hooks.on('applyActiveEffect', onApplyActiveEffect);

Hooks.on('preCreateActiveEffect', (effect, options, userId) => {
	const actor = effect.parent;
	if (!actor || !actor.system || !actor.system.immunities) return true;

	// Prevent creation on non-character actor types
	if (!actor.isCharacterType) {
		ui.notifications.error(`FU.ActorSheetEffectNotSupported`, { localize: true });
		return false;
	}

	// Check if the effect is a status effect
	const statusEffectId = CONFIG.statusEffects.find((e) => effect.statuses?.has(e.id))?.id;

	// Check for immunity using statusEffectId
	if (statusEffectId) {
		const immunityData = actor.system.immunities[statusEffectId];

		// If immune, block effect creation
		if (immunityData?.base) {
			const message = game.i18n.format('FU.ImmunityDescription', {
				status: statusEffectId,
			});

			ChatMessage.create({
				content: message,
				speaker: ChatMessage.getSpeaker({ actor: actor }),
			});

			return false; // Prevent the effect from being created
		}
	}

	return true; // Allow the effect to be created
});
