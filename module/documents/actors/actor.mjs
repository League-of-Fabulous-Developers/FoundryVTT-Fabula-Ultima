import { FUItem } from '../items/item.mjs';
import { FUHooks } from '../../hooks.mjs';
import { Effects, prepareActiveEffectCategories } from '../../pipelines/effects.mjs';
import { InlineSourceInfo } from '../../helpers/inline-helper.mjs';
import { FUActiveEffectModel } from '../effects/active-effect-model.mjs';
import { SkillDataModel } from '../items/skill/skill-data-model.mjs';
import { MathHelper } from '../../helpers/math-helper.mjs';
import { MiscAbilityDataModel } from '../items/misc/misc-ability-data-model.mjs';

/**
 * @typedef Actor
 * @description The client-side Actor document which extends the common BaseActor model.
 * @property {Boolean} isToken
 * @property {ActiveEffect[]} appliedEffects
 * @property {ActiveEffect[]} temporaryEffects
 * @property {Map<String, FUActiveEffect>} effects <Uuid, *>
 * @property {Map<String, FUItem>} items <Uuid, *>
 * @property {Boolean} inCombat
 * @property {Boolean} isOwner True if the user has ownership of the actor.
 * @property {String} id The canonical identifier for this Document.
 * @property {String} uuid A Universally Unique Identifier (uuid) for this Document instance.
 * @property {Function<Boolean, Boolean,[Token]>} getActiveTokens Retrieve an Array of active tokens which represent this Actor in the current
 * canvas Scene. If the canvas is not currently active, or there are no linked actors, the returned Array will be empty.
 * If the Actor is a synthetic token actor, only the exact Token which it represents will be returned.
 */

/**
 * @typedef Token
 * @description A Token is an implementation of PlaceableObject which represents an Actor within a viewed Scene on the game canvas.
 * @property {String} name Convenience access to the token's nameplate string
 * @property {Actor} actor A convenient reference to the Actor object associated with the Token embedded document.
 * @property {Combatant} combatant Return a reference to a Combatant that represents this Token, if one is present in the current encounter.
 * @property {Boolean} isTargeted An indicator for whether the Token is currently targeted by the active game User
 * @property {Point} center The Token's current central position
 */

/**
 * @class
 * @description Extend the base Actor document by defining a custom roll data structure
 * @extends {Actor}
 * @property {CharacterDataModel | NpcDataModel | PartyDataModel | SheetDataModel} system
 * @property {EffectCategories} effectCategories
 * @property {Boolean} isCharacterType
 * @remarks {@link https://foundryvtt.com/api/classes/client.Actor.html}
 * @inheritDoc
 */
export class FUActor extends Actor {
	/**
	 * @override
	 * @remarks Prepare data for the actor. Calling the super version of this executes
	 * the following in order:
	 *  -Data reset (to clear active effects),
	 * - prepareBaseData(),
	 * - prepareEmbeddedDocuments() (including active effects),
	 * - prepareDerivedData().
	 */
	prepareData() {
		super.prepareData();
		Hooks.callAll(FUHooks.DATA_PREPARED_ACTOR, this);
	}

	async getData(options = {}) {
		const data = await super.getData(options);
		// Add the spTracker data to the actor's data
		data.spTracker = this.spTracker;
		//Add the tlTracker data to the actor's data
		data.tlTracker = this.tlTracker;
		return data;
	}

	/** @override */
	prepareBaseData() {
		// Data modifications in this step occur before processing embedded
		// documents or derived data.
	}

	/**
	 * @override
	 * Augment the basic actor data with additional dynamic data. Typically,
	 * you'll want to handle most of your calculated/derived data in this step.
	 * Data calculated in this step should generally not exist in template.json
	 * (such as ability modifiers rather than ability scores) and should be
	 * available both inside and outside of character sheets (such as if an actor
	 * is queried and has a roll executed directly from it).
	 */
	prepareDerivedData() {
		this.items.forEach((item) => item.applyActiveEffects());
	}

	/**
	 * @override
	 */
	toObject() {
		const result = super.toObject();
		result.uuid = this.uuid;
		return result;
	}

	get tlTracker() {
		return this.system.tlTracker;
	}

	get spTracker() {
		return this.system.spTracker;
	}

	/**
	 * @returns {Boolean}
	 */
	get isCharacterType() {
		return this.type === 'character' || this.type === 'npc';
	}

	/**
	 * Override getRollData() that's supplied to rolls.
	 */
	getRollData() {
		const data = super.getRollData();
		return data;
	}

	/**
	 * @override
	 */
	async _preCreate(createData, options, user) {
		await super._preCreate(createData, options, user);
		if (this.type === 'character') {
			this.updateSource({
				prototypeToken: {
					actorLink: true,
					disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
				},
			});
		}
	}

	/**
	 * @override
	 */
	async _onCreate(createData, options, userId) {
		await super._onCreate(createData, options, userId);
		if (this.isCharacterType) {
			// Load the compendium
			const pack = game.packs.get('projectfu.basic-equipment');
			const content = await pack.getDocuments();

			// Find the item with system.fuid === 'unarmed-strike'
			const unarmedStrikeItem = content.find((item) => foundry.utils.getProperty(item, 'system.fuid') === 'unarmed-strike');

			if (unarmedStrikeItem) {
				// Check if the item already exists in the character's inventory
				const existingItem = this.items.find((item) => foundry.utils.getProperty(item, 'system.fuid') === 'unarmed-strike');

				if (!existingItem) {
					// Add the item to the character
					await this.createEmbeddedDocuments('Item', [unarmedStrikeItem.toObject()]);
				}
			}
		}
	}

	/**
	 * @override
	 */
	async _preUpdate(changed, options, user) {
		if (this.isCharacterType) {
			const changedHP = changed.system?.resources?.hp;
			const currentHP = this.system.resources.hp;

			if (typeof changedHP?.value === 'number' && currentHP) {
				const hpChange = changedHP.value - currentHP.value;
				const levelChanged = !!changed.system && 'level' in changed.system;
				if (hpChange !== 0 && !levelChanged) {
					options.damageTaken = hpChange * -1;
				}
			}
		}
		await super._preUpdate(changed, options, user);
	}

	/**
	 * @returns {Promise<void>}
	 * @private
	 * @override
	 */
	async _onUpdate(changed, options, userId) {
		if (this.isCharacterType) {
			const { hp } = this.system?.resources || {};

			if (hp && userId === game.userId) {
				const crisisThreshold = Math.floor(hp.max / 2);
				const shouldBeInCrisis = hp.value <= crisisThreshold;
				const isInCrisis = this.statuses.has('crisis');
				if (shouldBeInCrisis !== isInCrisis) {
					Hooks.call(
						FUHooks.CRISIS_EVENT,
						/** @type CrisisEvent **/
						{
							actor: this,
							token: this.resolveToken(),
						},
					);
					await Effects.toggleStatusEffect(this, 'crisis', InlineSourceInfo.fromInstance(this));
				}

				// Handle KO status
				const shouldBeKO = hp.value === 0; // KO when HP is 0
				const isKO = this.statuses.has('ko');
				if (shouldBeKO !== isKO) {
					Hooks.call(
						FUHooks.DEFEAT_EVENT,
						/** @type DefeatEvent **/
						{
							actor: this,
							token: this.resolveToken(),
						},
					);
					await Effects.toggleStatusEffect(this, 'ko', InlineSourceInfo.fromInstance(this));
				}
			}
		}
		super._onUpdate(changed, options, userId);
	}

	*allApplicableEffects() {
		for (const effect of super.allApplicableEffects()) {
			const item = effect.parent;

			if (item instanceof FUItem) {
				if (item.system.transferEffects instanceof Function ? item.system.transferEffects() : true) {
					yield effect;
				}
			} else {
				// Effects exist directly on the actor
				yield effect;
			}
		}
	}

	/**
	 * @return {Generator<ActiveEffect, void, void>}
	 */
	*allEffects() {
		for (const effect of this.effects) {
			yield effect;
		}
		for (const item of this.items) {
			for (const effect of item.effects) {
				yield effect;
			}
		}
	}

	/**
	 * @override
	 * @returns {ActiveEffect[]}
	 */
	get temporaryEffects() {
		const effects = super.temporaryEffects;
		for (const item of this.items) {
			if (this.isCharacterType) {
				if (item.system.transferEffects instanceof Function ? item.system.transferEffects() : true) {
					for (const effect of item.effects) {
						if (effect.isTemporary && effect.target === item) {
							effects.push(effect);
						}
					}
				}
			}
		}
		return effects;
	}

	/**
	 * @returns {EffectCategories}
	 * @remarks Used by modules mostly
	 */
	get effectCategories() {
		const effects = Array.from(this.allApplicableEffects());
		this.temporaryEffects.forEach((effect) => {
			if (effects.indexOf(effect) < 0) effects.push(effect);
		});
		return prepareActiveEffectCategories(effects);
	}

	applyActiveEffects() {
		if (this.system.prepareEmbeddedData instanceof Function) {
			this.system.prepareEmbeddedData();
		}
		return super.applyActiveEffects();
	}

	/**
	 * @returns {Token}
	 * @remarks https://foundryvtt.com/api/classes/client.TokenDocument.html
	 */
	resolveToken() {
		// For unlinked actors (usually NPCs)
		if (this.token) {
			return this.token.object;
		}
		// For linked actors (PCs, sometimes villains?)
		const tokens = this.getActiveTokens();
		if (tokens) {
			return tokens[0];
		}
		throw Error(`Failed to get token for ${this.uuid}`);
	}

	/**
	 * Returns an array of items that match a given FUID and optionally an item type
	 * @param {string} fuid - The FUID of the item(s) which you want to retrieve
	 * @param {string} [type] - Optionally, a type name to restrict the search
	 * @returns {Array} - An array containing the found items
	 */
	getItemsByFuid(fuid, type) {
		const fuidFilter = (i) => i.system.fuid === fuid;
		if (!type) return this.items.filter(fuidFilter);
		const itemTypes = this.itemTypes;
		if (!Object.prototype.hasOwnProperty.call(itemTypes, type)) {
			throw new Error(`Type ${type} is invalid!`);
		}
		return itemTypes[type].filter(fuidFilter);
	}

	/**
	 * @description Deletes all temporary effects on the actor
	 * @property includeStatus Whether to also clear status effects
	 * @property includeWithoutDuration Include effects without a duration
	 */
	clearTemporaryEffects(includeStatus = true, includeWithoutDuration = true) {
		// Collect effects to delete
		const effectsToDelete = this.effects.filter((effect) => {
			// If it's a status effect
			const statusEffectId = CONFIG.statusEffects.find((e) => effect.statuses?.has(e.id))?.id;
			if (statusEffectId) {
				if (!includeStatus && effect.system.duration.event === 'rest') {
					return false;
				}
				const immunity = this.system.immunities[statusEffectId];
				if (immunity) {
					return immunity;
				}
			}
			if (!effect.hasDuration && !includeWithoutDuration) {
				return false;
			}
			return effect.isTemporary && Effects.canBeRemoved(effect);
		});

		// Delete all collected effects
		if (effectsToDelete.length > 0) {
			Promise.all(effectsToDelete.map((effect) => effect.delete()));
		}
	}

	/**
	 * @description Clears all embedded items from the actor
	 * @remarks Use at your own risk!
	 */
	clearEmbeddedItems() {
		this.deleteEmbeddedDocuments(
			'Item',
			this.items.map((i) => i.id),
		);
	}

	/**
	 * Fetch an item that matches a given FUID and optionally an item type
	 * @param {string} fuid - The FUID of the item(s) which you want to retrieve
	 * @param {string} [type] - Optionally, a type name to restrict the search
	 * @returns {FUItem|undefined} - The matching item, or undefined if none was found.
	 */
	getSingleItemByFuid(fuid, type) {
		return this.getItemsByFuid(fuid, type)[0];
	}

	/**
	 * @description Resolves a progress tracker with the given id among
	 * the actor's items and effects.
	 * @param {String} id
	 * @returns {ProgressDataModel}
	 */
	resolveProgress(id) {
		// Search items
		const items = this.items.values();
		for (const item of items) {
			const progress = item.getProgress();
			// Match the fuid on the item or on the progress track
			if (progress) {
				if (id === item.system.fuid || id === progress.id) {
					return progress;
				}
			}
		}
		// Search active effects: match the id on the progress track
		for (const effect of this.effects.values()) {
			if (effect.system.rules.progress.enabled) {
				const progress = effect.system.rules.progress;
				if (progress.id === id) {
					return progress;
				}
			}
		}
		return null;
	}

	/**
	 * @description Searches through current items for one with the given fuid, then updates its progress.
	 * @param {String} id
	 * @param {Number} increment
	 * @returns {ProgressDataModel} The updated progress data
	 */
	async updateProgress(id, increment) {
		const progress = this.resolveProgress(id);
		if (!progress) {
			return null;
		}

		const current = MathHelper.clamp(progress.current + increment * progress.step, 0, progress.max);

		// Skill
		if (progress.parent instanceof SkillDataModel) {
			await progress.parent.parent.update({ 'system.rp.current': current });
		}
		// MiscAbility
		else if (progress.parent instanceof MiscAbilityDataModel) {
			const schemaName = progress.schema.name;
			await progress.parent.parent.update({ [`system.${schemaName}.current`]: current });
		}
		// ActiveEffect
		else if (progress.parent.parent instanceof FUActiveEffectModel) {
			await progress.parent.parent.update({ [`system.rules.progress.current`]: current });
		}

		// Update this instance for tracking, though it is not the same as the one that just got replaced in the model
		progress.current = current;
		return progress;
	}
}
