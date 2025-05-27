import { SOCKET } from '../../socket.mjs';
import { ChecksV2 } from '../../checks/checks-v2.mjs';
import { slugify } from '../../util.mjs';
import { FUHooks } from '../../hooks.mjs';
import { FUActor } from '../actors/actor.mjs';

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
export class FUItem extends Item {
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
	}

	/**
	 * Prepare a data object which is passed to any Roll formulas that are created related to this Item.
	 * @private
	 * @returns {object|null} The roll data object, or null if no actors is associated with this item.
	 */
	getRollData() {
		// If present, return the actors's roll data.
		if (!this.actor) return null;
		const rollData = this.actor.getRollData();

		// Grab the item's system data as well.
		rollData.item = foundry.utils.deepClone(this.system);

		return rollData;
	}

	/**
	 * @override
	 */
	toObject() {
		const result = super.toObject();
		result.uuid = this.uuid;
		return result;
	}

	/**
	 * @returns {ProgressDataModel}
	 * @remarks Returns clocks before resources
	 */
	getProgress() {
		// Search for legacy clock data among the data models
		if (this.system.hasClock && this.system.hasClock.value) {
			return this.system.progress;
		}
		if (this.system.hasResource && this.system.hasResource.value) {
			return this.system.rp;
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
			SOCKET.executeForEveryone('use', this.name);
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
			return ChecksV2.display(this.actor, this);
		}
	}

	applyActiveEffects() {
		const overrides = {};

		// Organize non-disabled effects by their application priority
		const changes = [];
		for (const effect of this.allApplicableEffects()) {
			if (!effect.active) continue;
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
			if (!change.key) continue;
			const changes = change.effect.apply(this, change);
			Object.assign(overrides, changes);
		}

		// Expand the set of final overrides
		this.overrides = foundry.utils.expandObject(overrides);
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

		const confirmation = await Dialog.confirm({
			title: game.i18n.localize('FU.FUID.Regenerate'),
			content: html,
			defaultYes: false,
			options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		});

		if (!confirmation) return;

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
