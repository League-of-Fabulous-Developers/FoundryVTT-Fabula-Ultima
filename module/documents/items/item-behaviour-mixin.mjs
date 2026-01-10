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

		/**
		 * Augment the basic Item data model with additional dynamic data.
		 * This method is automatically called when an item is created or updated.
		 */
		prepareData() {
			super.prepareData();
			Hooks.callAll(FUHooks.DATA_PREPARED_ITEM, this);
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
							effects.push(...item.transferredEffects);
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
				if (collection.documentClass === PseudoItem) {
					for (let item of collection) {
						for (let effect of item.allEffects()) {
							yield effect;
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

		applyActiveEffects() {
			const overrides = {};

			// Organize non-disabled effects by their application priority
			const changes = [];
			for (const effect of this.allApplicableEffects()) {
				if (!effect.active) {
					continue;
				}
				changes.push(
					...effect.changes.map((change) => {
						const c = foundry.utils.deepClone(change);
						c.effect = effect;
						c.order = c.priority ?? c.mode * 10;
						return c;
					}),
				);
			}
			changes.sort((a, b) => a.order - b.order);

			// Apply all changes
			for (let change of changes) {
				if (!change.key) {
					continue;
				}
				const changes = change.effect.apply(this, change);
				Object.assign(overrides, changes);
			}

			// Expand the set of final overrides
			this.overrides = foundry.utils.expandObject(overrides);

			if (this.system.afterApplyActiveEffects) {
				this.system.afterApplyActiveEffects();
			}

			for (const item of this.allItems()) {
				if (item.applyActiveEffects) {
					item.applyActiveEffects();
				}
			}

			this.render();
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
			// TODO: Set up event to replace the roll action.
			const config = new ItemRollConfiguration(this, modifiers);
			await CommonEvents.itemRoll(config, this.parent);
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
			if (this.system.hasClock?.value) {
				// MiscAbilityDataModel
				return this.system.progress;
			}
			if (this.system.hasResource?.value) {
				// SkillDataModel
				return this.system.rp;
			}
			if (this.system.data?.hasClock?.value) {
				// OptionalFeatureDataModel
				return this.system.data.progress;
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
