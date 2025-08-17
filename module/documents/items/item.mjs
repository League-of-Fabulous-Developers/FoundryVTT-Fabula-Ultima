import { Checks } from '../../checks/checks.mjs';
import { slugify } from '../../util.mjs';
import { FUHooks } from '../../hooks.mjs';
import { FUActor } from '../actors/actor.mjs';
import { EnablePseudoDocumentsMixin } from '../pseudo/enable-pseudo-documents-mixin.mjs';
import { PseudoItem } from '../pseudo/pseudo-item.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { SETTINGS } from '../../settings.js';

/**
 * @typedef KeyboardModifiers
 * @property {boolean} shift
 * @property {boolean} alt
 * @property {boolean} ctrl
 * @property {boolean} meta
 */

/**
 * @typedef Item
 * @property {Actor} actor
 * @property {String} uuid
 * @property {String} name
 * @property {Map<String, Object>} effects
 * @property {Object} FUActor
 */

/**
 * @description Extend the basic Item document with some very simple modifications.
 * @property {foundry.abstract.TypeDataModel} system
 * @property {FUActor} actor
 * @extends {Item}
 * @inheritDoc
 */
export class FUItem extends EnablePseudoDocumentsMixin(Item) {
	static async createDialog(data = {}, { parent = null, pack = null, types, ...options } = {}) {
		console.log(data, parent, pack, types, options);
		if (!game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			types ??= FUItem.TYPES.filter((value) => !['mnemosphere', 'hoplosphere', 'mnemosphereReceptacle'].includes(value));
		}

		return super.createDialog(data, { ...options, parent, pack, types });
	}

	overrides = this.overrides ?? {};

	/**
	 * Augment the basic Item data model with additional dynamic data.
	 * This method is automatically called when an item is created or updated.
	 */
	prepareData() {
		// As with the actors class, items are documents that can have their data
		// preparation methods overridden (such as prepareBaseData()).
		super.prepareData();
		Hooks.callAll(FUHooks.DATA_PREPARED_ITEM, this);
		for (const nestedItem of this.allItems()) {
			Hooks.callAll(FUHooks.DATA_PREPARED_ITEM, nestedItem);
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
	 * @override
	 */
	toObject(source) {
		const result = super.toObject(source);
		result.uuid = this.uuid;
		return result;
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
			if (effect.system.rules.progress.enabled) {
				return effect.system.rules.progress;
			}
		}
		return null;
	}

	// TODO: Yes this is janky, but still performant okay?
	get canStash() {
		switch (this.type) {
			case 'weapon':
			case 'armor':
			case 'shield':
			case 'treasure':
			case 'material':
			case 'artifact':
			case 'accessory':
			case 'consumable': {
				return true;
			}
		}
		return false;
	}

	/**
	 * Handle clickable rolls.
	 * @param {KeyboardModifiers} modifiers
	 */
	async roll(modifiers = { shift: false, alt: false, ctrl: false, meta: false }) {
		if (this.system.showTitleCard?.value) {
			game.projectfu.socket.showBanner(this.name);
		}

		return this.handleCheckV2(modifiers);
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<undefined>}
	 */
	async handleCheckV2(modifiers) {
		if (this.system.roll instanceof Function) {
			return this.system.roll(modifiers);
		} else {
			return Checks.display(this.actor, this);
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

	*allApplicableEffects() {
		for (const effect of this.effects) {
			// only yield effects that try to modify the item and not the actor
			if (effect.target === this) {
				yield effect;
			}
		}
	}

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

	get isEquipped() {
		if (this.actor && this.actor.isCharacterType) {
			return this.actor.system.equipped.isEquipped(this);
		}
		return false;
	}
}

Hooks.on('preCreateItem', (item, options, userId) => {
	// If the parent is an actor
	if (item.parent instanceof FUActor) {
		/** @type {FUActor} **/
		const actor = item.parent;
		// If the actor is NOT character type
		if (!actor.isCharacterType) {
			// Do not support effect creation on non-characters
			if (item.type === 'effect') {
				ui.notifications.error(`FU.ActorSheetEffectNotSupported`, { localize: true });
				return false;
			}
			// Only support white-listed item types
			if (!item.canStash) {
				ui.notifications.error(`FU.ActorSheetItemNotSupported`, { localize: true });
				return false;
			}
		}
	}

	// If no FUID has been generated
	if (!item.system.fuid && item.name) {
		// Generate FUID using the slugify utility
		const fuid = game.projectfu.util.slugify(item.name);

		// Check if slugify returned a valid FUID
		if (fuid) {
			item.updateSource({ 'system.fuid': fuid });
		} else {
			console.error('FUID generation failed for Item:', item.name, 'using slugify.');
		}
	}
});
