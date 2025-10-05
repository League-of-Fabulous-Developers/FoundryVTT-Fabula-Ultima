import { PseudoDocumentTypeField } from '../pseudo/pseudo-document-type-field.mjs';
import { PseudoDocumentCollectionField } from '../pseudo/pseudo-document-collection-field.mjs';
import { PseudoDocumentTypeDataField } from '../pseudo/pseudo-document-type-data-field.mjs';
import { PseudoDocument } from '../pseudo/pseudo-document.mjs';
import { PseudoActiveEffect } from '../effects/pseudo-active-effect.mjs';
import { FUItem } from './item.mjs';
import { ItemBehaviourMixin } from './item-behaviour-mixin.mjs';

class BasePseudoItem extends PseudoDocument {
	static documentName = 'Item';

	static defineSchema() {
		const { FilePathField, ObjectField, StringField, IntegerSortField } = foundry.data.fields;
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
			sort: new IntegerSortField(),
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
