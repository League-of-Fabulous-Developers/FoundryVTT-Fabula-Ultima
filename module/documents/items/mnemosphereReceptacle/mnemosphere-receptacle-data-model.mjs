import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../../pseudo/pseudo-item.mjs';
import { PseudoDocumentEnabledTypeDataModel } from '../../pseudo/enable-pseudo-documents-mixin.mjs';

/**
 * @property {string} source
 * @property {boolean} isFavored.value
 * @property {number} slotCount
 * @property {FUItem[]} slotted
 * @property {PseudoDocumentCollection} items
 */
export class MnemosphereReceptacleDataModel extends PseudoDocumentEnabledTypeDataModel {
	static defineSchema() {
		const { StringField, NumberField, SchemaField, BooleanField } = foundry.data.fields;
		return {
			source: new StringField({ blank: true }),
			summary: new StringField({ blank: true }),
			isFavored: new SchemaField({ value: new BooleanField() }),
			slotCount: new NumberField({ initial: 1, min: 1, max: 5 }),
			items: new PseudoDocumentCollectionField(PseudoItem),
		};
	}

	get usedSlots() {
		return this.items.filter((item) => item.type === 'mnemosphere').length;
	}
}
