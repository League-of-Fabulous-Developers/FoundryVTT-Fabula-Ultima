import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../pseudo-item.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { PseudoDocumentEnabledTypeDataModel } from '../../pseudo/pseudo-document-enabled-type-data-model.mjs';
import { MnemosphereDataModel } from '../mnemosphere/mnemosphere-data-model.mjs';

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

	slotMnemosphere(item) {
		if (item?.type === 'mnemosphere') {
			const promises = [];
			promises.push(this.createEmbeddedDocuments(PseudoItem.documentName, [item.toObject(true)]));
			if (item.isEmbedded) {
				promises.push(item.delete());
			}
			return Promise.all(promises);
		} else {
			ui.notifications.error('FU.TechnospheresSlottingErrorMnemosphereOnly', { localize: true });
		}
	}

	removeMnemosphere(mnemosphere) {
		const promises = [];
		const item = this.items.get(mnemosphere.id);
		if (item.actor && item.system instanceof MnemosphereDataModel) {
			const itemObject = item.toObject(true);
			promises.push(this.parent.actor.createEmbeddedDocuments('Item', [itemObject]));
		}
		promises.push(item.delete());
		return Promise.all(promises);
	}
}
