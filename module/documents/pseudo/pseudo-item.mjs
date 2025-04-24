import { PseudoDocumentTypeField } from './pseudo-document-type-field.mjs';
import { PseudoDocumentCollectionField } from './pseudo-document-collection-field.mjs';
import { PseudoDocumentTypeDataField } from './pseudo-document-type-data-field.mjs';
import { PseudoDocument } from './pseudo-document.mjs';
import { PseudoActiveEffect } from './pseudo-active-effect.mjs';
import { FUItem } from '../items/item.mjs';
import { SOCKET } from '../../socket.mjs';
import { ChecksV2 } from '../../checks/checks-v2.mjs';

export class PseudoItem extends PseudoDocument {
	static documentName = 'Item';

	static defineSchema() {
		const { FilePathField, ObjectField, StringField } = foundry.data.fields;
		return {
			_id: new StringField({ initial: () => foundry.utils.randomID(), validate: foundry.data.validators.isValidId }),
			name: new StringField({ initial: () => game.i18n.format('DOCUMENT.New', { type: game.i18n.localize(this.metadata.label) }), required: true, blank: false, textSearch: true }),
			type: new PseudoDocumentTypeField(this),
			img: new FilePathField({
				categories: ['IMAGE'],
				initial: (data) => {
					return FUItem.getDefaultArtwork(data).img;
				},
			}),
			system: new PseudoDocumentTypeDataField(this),
			effects: new PseudoDocumentCollectionField(PseudoActiveEffect),
			flags: new ObjectField(),
		};
	}

	static metadata = Object.freeze(
		foundry.utils.mergeObject(
			super.metadata,
			{
				hasTypeData: true,
				label: 'DOCUMENT.Item',
			},
			{ inplace: false },
		),
	);

	overrides = this.overrides ?? {};

	/* -------------------------------------------- */

	/**
	 * Return an array of the Active Effect instances which originated from this PseudoItem.
	 * The returned instances are the ActiveEffect instances which exist on the PseudoItem itself or on any PseudoItem nested inside it.
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

	/* -------------------------------------------- */
	/*  Methods                                     */
	/* -------------------------------------------- */

	/**
	 * Return a data object which defines the data schema against which dice rolls can be evaluated.
	 * By default, this is directly the Item's system data, but systems may extend this to include additional properties.
	 * If overriding or extending this method to add additional properties, care must be taken not to mutate the original
	 * object.
	 * @returns {object}
	 */
	getRollData() {
		return this.system;
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

	async roll(modifiers = { shift: false, alt: false, ctrl: false, meta: false }) {
		if (this.system.showTitleCard?.value) {
			SOCKET.executeForEveryone('use', this.name);
		}
		if (this.system.roll instanceof Function) {
			return this.system.roll(modifiers);
		} else {
			return ChecksV2.display(this.actor, this);
		}
	}

	*allItems() {
		for (const collection of Object.values(this.nestedCollections)) {
			if (foundry.utils.isSubclass(collection.documentClass, PseudoItem)) {
				for (let item of collection) {
					yield item;
					if ('allItems' in item) {
						for (const nestedItem of item.allItems()) {
							if (item.system.transferNestedItem ? item.system.transferNestedItem(nestedItem) : true) {
								yield nestedItem;
							}
						}
					}
				}
			}
		}
	}
}
