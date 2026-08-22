import { PseudoItem } from './pseudo-item.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { Flags } from '../../helpers/flags.mjs';
import { Checks } from '../../checks/checks.mjs';
import { ItemMigrations } from './item-migrations.mjs';
import { FUHooks } from '../../hooks.mjs';
import { slugify } from '../../util.mjs';
import { CommonEvents, ItemRollConfiguration } from '../../checks/common-events.mjs';

const socketableTypes = new Set(['hoplosphere', 'mnemosphere']);

const stashableTypes = new Set(['accessory', 'armor', 'consumable', 'customWeapon', 'hoplosphere', 'mnemosphere', 'shield', 'treasure', 'weapon']);

/**
 * @param BaseClass
 * @return {typeof FUItemBehaviourMixin}
 */
export function ItemBehaviourMixin(BaseClass) {
	return class FUItemBehaviourMixin extends BaseClass {
		static migrateData(source) {
			source = super.migrateData(source);
			ItemMigrations.run(source);
			return source;
		}

		overrides = this.overrides ?? {};

		_configure(options) {
			super._configure(options);

			/**
			 * Track completed core ActiveEffect application phases as a backward compatibility measure for packages calling
			 * Actor#applyActiveEffects without a phase argument.
			 * @type {Set<string>}
			 * @private
			 */
			Object.defineProperty(this, '_completedActiveEffectPhases', { value: new Set() });
		}

		/**
		 * Augment the basic Item data model with additional dynamic data.
		 * This method is automatically called when an item is created or updated.
		 */
		prepareData() {
			super.prepareData();
			Hooks.callAll(FUHooks.DATA_PREPARED_ITEM, this);
		}

		/** @inheritDoc */
		prepareBaseData() {
			this._clearData();
		}

		/* -------------------------------------------- */

		/**
		 * Clear or replace properties not automatically reset by upstream initialization.
		 * @protected
		 */
		_clearData() {
			this.overrides = {};
			this._completedActiveEffectPhases.clear();
		}

		/**
		 * Return an array of the Active Effect instances which originated from this (Pseudo)Document.
		 * The returned instances are the ActiveEffect instances which exist on the (Pseudo)Document itself or on any (Pseudo)Document nested inside it.
		 * @type {ActiveEffect[]}
		 */
		get transferredEffects() {
			if (this.system.transferEffects ? this.system.transferEffects() : true) {
				const effects = this.effects.filter((e) => e.transfer === true).filter((e) => (this.system.shouldApplyEffect ? this.system.shouldApplyEffect(e) : true));
				for (let collection of Object.values(this.nestedCollections)) {
					if (collection.documentClass === PseudoItem) {
						for (let item of collection) {
							if (this.system.transferNestedItem ? this.system.transferNestedItem(item) : true) {
								effects.push(...item.transferredEffects);
							}
						}
					}
				}
				return effects;
			} else {
				return [];
			}
		}

		*allEffects() {
			for (let effect of this.effects) {
				yield effect;
			}
			for (let collection of Object.values(this.nestedCollections)) {
				if (foundry.utils.isSubclass(collection.documentClass, PseudoItem)) {
					for (let item of collection) {
						if (this.system.transferNestedItem ? this.system.transferNestedItem(item) : true) {
							for (let effect of item.allEffects()) {
								yield effect;
							}
						}
					}
				}
			}
		}

		*allApplicableEffects() {
			for (const effect of this.effects) {
				// only yield effects that try to modify the item and not the actor
				if (effect.target === this) {
					yield effect;
				}
			}
		}

		applyActiveEffects(phase) {
			/** @type {typeof foundry.documents.ActiveEffect} */
			const ActiveEffect = foundry.documents.ActiveEffect.implementation;
			if (typeof phase !== 'string') {
				phase = this._completedActiveEffectPhases.has('initial') ? 'final' : 'initial';
				const message = 'Actor#applyActiveEffects must be called with a string phase identifier, with "initial"' + ' as the first phase.';
				foundry.utils.logCompatibilityWarning(message, { since: 14, until: 16, once: true });
			} else if (!(phase in ActiveEffect.CHANGE_PHASES)) {
				const error = new Error(`"${phase}" is not a registered ActiveEffect application phase.`);
				Hooks.onError('Actor#applyActiveEffects', error, { log: 'error' });
			}
			if (this._completedActiveEffectPhases.has(phase)) {
				const error = new Error(`ActiveEffect application phase "${phase}" has already completed and cannot be run again` + " in this Actor's data-preparation cycle.");
				Hooks.onError('Actor#applyActiveEffects', error, { log: 'error' });
				return;
			}
			this._completedActiveEffectPhases.add(phase);

			// Organize non-disabled effects by their application priority
			/** @type {ActiveEffectChangeData[]} */
			const changes = [];
			/** @type {ActiveEffectChangeData[]} */
			const rollData = this.getRollData();
			const dataByEffect = new Map();
			for (const effect of this.allApplicableEffects()) {
				if (!effect.active) continue;
				const replacementData = effect.getReplacementData(rollData);
				dataByEffect.set(effect, replacementData);
				for (const change of effect.system.changes) {
					if (change.key === '' || !effect.shouldApplyChange(change, { phase, replacementData })) continue;
					const copy = foundry.utils.deepClone(change);
					copy.effect = effect;
					changes.push(copy);
				}
			}
			changes.sort((a, b) => a.priority - b.priority);
			ActiveEffect._shimChanges(changes);

			// Apply all changes
			const overrides = {};
			for (const change of changes) {
				const replacementData = dataByEffect.get(change.effect) ?? rollData;
				const result = ActiveEffect.applyChange(this, change, { replacementData });
				if (foundry.utils.isPlainObject(result)) Object.assign(overrides, result);
			}

			// Expand the set of final overrides
			foundry.utils.mergeObject(this.overrides, foundry.utils.expandObject(overrides));

			if (phase === 'final') {
				this.render();
			}
		}

		*allItems() {
			for (const collection of Object.values(this.nestedCollections)) {
				if (foundry.utils.isSubclass(collection.documentClass, PseudoItem)) {
					for (let item of collection) {
						if (this.system.transferNestedItem ? this.system.transferNestedItem(item) : true) {
							yield item;
							if ('allItems' in item) {
								for (const nestedItem of item.allItems()) {
									yield nestedItem;
								}
							}
						}
					}
				}
			}
		}

		get isEquipped() {
			if (this.actor && ['character', 'npc'].includes(this.actor.type)) {
				return this.actor.system.equipped.isEquipped(this);
			}
			return false;
		}

		get canStash() {
			// Make exceptions for specific class features
			if (this.type === 'classFeature') {
				return !!this.system.data.constructor.canStash;
			}
			// Handle basic item types
			return stashableTypes.has(this.type);
		}

		get isSocketable() {
			return socketableTypes.has(this.type);
		}

		get isFavorite() {
			return !!this.getFlag(SYSTEM, Flags.Favorite);
		}

		/**
		 * @param {boolean} [force] if present sets that value, if absent toggles
		 * @return {Promise<void>}
		 */
		async toggleFavorite(force) {
			await this.setFlag(SYSTEM, Flags.Favorite, force ?? !this.isFavorite);
		}

		/**
		 * Handle clickable rolls.
		 * @param {KeyboardModifiers} modifiers
		 */
		async roll(modifiers = { shift: false, alt: false, ctrl: false, meta: false }) {
			const actor = this.parent?.documentName === 'Actor' ? this.parent : undefined;
			const config = new ItemRollConfiguration(this, modifiers);
			await CommonEvents.itemRoll(config, actor);
			if (config.override) {
				await config.override();
			} else {
				if (this.system.showTitleCard?.value) {
					await game.projectfu.socket.showBanner(this.name);
				}
				if (this.system.roll instanceof Function) {
					return this.system.roll(modifiers);
				} else {
					return Checks.display(this.actor, this);
				}
			}
		}

		/**
		 * Prepare a data object which is passed to any Roll formulas that are created related to this Item.
		 * @private
		 * @returns {object|null} The roll data object, or null if no actors is associated with this item.
		 */
		getRollData() {
			// If present, return the actor's roll data.
			if (!this.actor) {
				return null;
			}
			const rollData = this.actor.getRollData();

			// Grab the item's system data as well.
			rollData.item = foundry.utils.deepClone(this.system);

			return rollData;
		}

		/**
		 * @returns {ProgressDataModel}
		 * @remarks Returns clocks before resources
		 */
		getProgress() {
			// Search for legacy clock data among the data models
			// MiscAbilityDataModel
			if (this.system.hasClock?.value) {
				return this.system.progress;
			}
			// SkillDataModel
			if (this.system.hasResource?.value) {
				return this.system.rp;
			}

			// OptionalFeatureDataModel
			if (this.system.data?.hasClock?.value) {
				return this.system.data.progress;
			}
			// ClassFeatureDataModel (some such as GardenDataModel)
			else if (this.system.data?.clock) {
				return this.system.data.clock;
			}
			// Search among active effects in the item
			for (const effect of this.effects.values()) {
				if (effect.system.rules.progress?.enabled) {
					return effect.system.rules.progress;
				}
			}
			return null;
		}

		/**
		 * Renders a dialog to confirm the FUID change and if accepted updates the FUID on the item.
		 * @returns {Promise<string|undefined>} The generated FUID or undefined if no change was made.
		 */
		async regenerateFUID() {
			const html = `
			<div class="warning-message">
			<p>${game.i18n.localize('FU.FUID.ChangeWarning2')}</p>
			<p>${game.i18n.localize('FU.FUID.ChangeWarning3')}</p>
			</div>
			`;

			const confirmation = await foundry.applications.api.DialogV2.confirm({
				window: { title: game.i18n.localize('FU.FUID.Regenerate') },
				content: html,
				defaultYes: false,
				options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
			});

			if (!confirmation) {
				return;
			}

			const fuid = slugify(this.name);
			await this.update({ 'system.fuid': fuid });

			return fuid;
		}
	};
}
