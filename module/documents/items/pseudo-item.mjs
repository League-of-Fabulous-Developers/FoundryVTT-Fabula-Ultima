import { PseudoDocumentCollectionField } from '../pseudo/pseudo-document-collection-field.mjs';
import { PseudoDocument } from '../pseudo/pseudo-document.mjs';
import { PseudoActiveEffect } from '../effects/pseudo-active-effect.mjs';
import { ItemBehaviourMixin } from './item-behaviour-mixin.mjs';

class BasePseudoItem extends PseudoDocument {
	static documentName = 'Item';

	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			_id: new fields.StringField({ initial: () => foundry.utils.randomID(), validate: foundry.data.validators.isValidId }),
			name: new fields.StringField({ initial: () => game.i18n.format('DOCUMENT.New', { type: game.i18n.localize(this.metadata.label) }), required: true, blank: false, textSearch: true }),
			type: new fields.DocumentTypeField(this),
			img: new fields.FilePathField({
				categories: ['IMAGE'],
				initial: (data) => {
					return foundry.documents.Item.implementation.getDefaultArtwork(data).img;
				},
			}),
			system: new fields.TypeDataField(this),
			effects: new PseudoDocumentCollectionField(PseudoActiveEffect),
			sort: new fields.IntegerSortField(),
			flags: new fields.DocumentFlagsField(),
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
}

export class PseudoItem extends ItemBehaviourMixin(BasePseudoItem) {}
