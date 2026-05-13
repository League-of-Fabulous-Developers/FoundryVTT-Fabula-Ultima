import { FUActor } from '../actors/actor.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { EnablePseudoDocumentsMixin } from '../pseudo/enable-pseudo-documents-mixin.mjs';
import { SETTINGS } from '../../settings.js';
import { ItemBehaviourMixin } from './item-behaviour-mixin.mjs';
import { CommonEvents } from '../../checks/common-events.mjs';

/**
 * @typedef Item
 * @property {Actor} actor
 * @property {String} id
 * @property {String} uuid
 * @property {String} name
 * @property {Map<String, Object>} effects
 * @property {String} type The type of the data model used.
 * @property {DataModel} system The data model used.
 */

/**
 * @description Extend the basic Item document with some very simple modifications.
 * @property {foundry.abstract.TypeDataModel} system
 * @property {FUActor} actor
 * @extends {Item}
 * @inheritDoc
 */
export class FUItem extends EnablePseudoDocumentsMixin(ItemBehaviourMixin(Item)) {
	static async createDialog(data = {}, { parent = null, pack = null, types, ...options } = {}) {
		if (!game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			types ??= FUItem.TYPES.filter((value) => !['mnemosphere', 'hoplosphere', 'mnemosphereReceptacle'].includes(value));
		}

		return super.createDialog(data, { ...options, parent, pack, types });
	}

	async update(delta) {
		const previous = this.system.toObject();
		const postUpdate = await super.update(delta);

		if (delta.system?.progress) {
			if (previous.progress.current !== postUpdate.system.progress.current) {
				// Progress is changed
				CommonEvents.progress(this, this.system.progress, 'update', delta.system.progress.current ? delta.system.progress.current - previous.progress.current : 0, this);
			}
		}
		return postUpdate;
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
