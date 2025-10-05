import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../pseudo-item.mjs';
import { PseudoDocumentEnabledTypeDataModel } from '../../pseudo/enable-pseudo-documents-mixin.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';

/** @type RenderCheckHook */
const onRenderCheck = (sections, check, actor, item, additionalFlags, targets) => {
	if (item?.system instanceof MnemosphereReceptacleDataModel) {
		CommonSections.slottedTechnospheres(sections, item.system.slotted);
		CommonSections.description(sections, item.system.description, item.system.summary, undefined, false);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {string} source
 * @property {boolean} isFavored.value
 * @property {number} slotCount
 * @property {FUItem[]} slotted
 * @property {PseudoDocumentCollection} items
 */
export class MnemosphereReceptacleDataModel extends PseudoDocumentEnabledTypeDataModel {
	static defineSchema() {
		const { StringField, NumberField } = foundry.data.fields;
		return {
			source: new StringField({ blank: true }),
			summary: new StringField({ blank: true }),
			description: new StringField({ blank: true }),
			slotCount: new NumberField({ initial: 1, min: 1, max: 5 }),
			items: new PseudoDocumentCollectionField(PseudoItem),
		};
	}

	get usedSlots() {
		return this.items.filter((item) => item.type === 'mnemosphere').length;
	}

	get slotted() {
		return this.items.filter((item) => item.type === 'mnemosphere');
	}
}
