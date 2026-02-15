import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { ArmorMigrations } from './armor-migrations.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../pseudo-item.mjs';
import { SETTINGS } from '../../../settings.js';
import { PseudoDocumentEnabledTypeDataModel } from '../../pseudo/pseudo-document-enabled-type-data-model.mjs';

Hooks.on(CheckHooks.renderCheck, (data, check, actor, item) => {
	if (item?.system instanceof ArmorDataModel) {
		CommonSections.tags(data.sections, [
			{
				tag: 'FU.Martial',
				show: item.system.isMartial.value,
			},
			{
				tag: 'FU.DefenseAbbr',
				value: item.system.def.attribute ? `${game.i18n.localize(FU.attributeAbbreviations[item.system.def.attribute])} + ${item.system.def.value}` : `${item.system.def.value}`,
			},
			{
				tag: 'FU.MagicDefenseAbbr',
				value: item.system.mdef.attribute ? `${game.i18n.localize(FU.attributeAbbreviations[item.system.mdef.attribute])} + ${item.system.mdef.value}` : `${item.system.def.value}`,
			},
			{
				tag: 'FU.InitiativeAbbr',
				value: item.system.init.value,
			},
		]);

		CommonSections.quality(data.sections, item.system.quality.value);

		if (game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			CommonSections.slottedTechnospheres(data.sections, item.system.slotted);
		} else {
			CommonSections.description(data.sections, item.system.description, item.system.summary.value);
		}
	}
});

const slottableTypes = new Set(['mnemosphere', 'hoplosphere']);

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {number} cost.value
 * @property {boolean} isMartial.value
 * @property {string} quality.value
 * @property {number} def.value
 * @property {Attribute} def.attribute
 * @property {number} mdef.value
 * @property {Attribute} mdef.attribute
 * @property {number} init.value
 * @property {string} source.value
 * @property {"alpha","beta","gamma"} slots
 */
export class ArmorDataModel extends PseudoDocumentEnabledTypeDataModel {
	static {
		deprecationNotice(this, 'attributes.primary.value', 'def.attribute');
		deprecationNotice(this, 'attributes.secondary.value', 'mdef.attribute');
		deprecationNotice(this, 'isBehaviour.value');
		deprecationNotice(this, 'weight.value');
		deprecationNotice(this, 'rollInfo.useWeapon.hrZero.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField } = foundry.data.fields;
		return Object.assign(FUStandardItemDataModel.defineSchema(), {
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			isMartial: new SchemaField({ value: new BooleanField() }),
			quality: new SchemaField({ value: new StringField() }),
			slots: new StringField({ choices: Object.keys(FU.technospheres.armorSlots), initial: 'alpha' }),
			def: new SchemaField({
				attribute: new StringField({ initial: 'dex', blank: true, choices: Object.keys(FU.attributes) }),
				value: new NumberField({ initial: 0, integer: true, nullable: false }),
			}),
			mdef: new SchemaField({
				attribute: new StringField({ initial: 'ins', blank: true, choices: Object.keys(FU.attributes) }),
				value: new NumberField({ initial: 0, integer: true, nullable: false }),
			}),
			init: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			items: new PseudoDocumentCollectionField(PseudoItem),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source);
		ArmorMigrations.run(source);
		return source;
	}

	prepareBaseData() {
		if (this.isMartial.value) {
			this.def.attribute = '';
		}

		if (game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			this.quality.value = game.i18n.localize(FU.technospheres.armorSlots[this.slots]?.label);
		}
	}

	prepareDerivedData() {
		this.slotted = this.items
			.filter((item) => slottableTypes.has(item.type))
			.sort((left, right) => {
				if (left.type === 'mnemosphere' && right.type === 'hoplosphere') {
					return -1;
				}
				if (right.type === 'mnemosphere' && left.type === 'hoplosphere') {
					return 1;
				}
				return 0;
			});
	}

	get slotCount() {
		return FU.technospheres.armorSlots[this.slots]?.slots;
	}

	get mnemosphereSlots() {
		return FU.technospheres.armorSlots[this.slots]?.mnemospheres;
	}

	transferEffects() {
		return this.parent.isEquipped && !this.parent.actor?.system.vehicle?.armorActive;
	}

	transferNestedItem(item) {
		if (!game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			return false;
		}
		if (!this.transferEffects()) {
			return false;
		}
		return slottableTypes.has(item.type);
	}

	get attributePartials() {
		if (game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			return [ItemPartialTemplates.standard, ItemPartialTemplates.slotSelectArmor, ItemPartialTemplates.costStandalone, ItemPartialTemplates.initiativeField, ItemPartialTemplates.armor];
		} else {
			return [ItemPartialTemplates.standard, ItemPartialTemplates.qualityCost, ItemPartialTemplates.initiativeField, ItemPartialTemplates.armor];
		}
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	equipArmor(event, target) {
		// TODO: find better solution, equipment data model maybe?
		return this.parent.actor.equipmentHandler.handleItemClick(event, target);
	}

	slotTechnosphere(technosphere) {
		if (slottableTypes.has(technosphere.type)) {
			if (technosphere.type === 'hoplosphere' && technosphere.system.socketable === 'weapon') {
				ui.notifications.error('FU.TechnospheresSlottingErrorWeaponOnly', { localize: true });
				return;
			}

			const promises = [];
			promises.push(this.createEmbeddedDocuments(PseudoItem.documentName, [technosphere.toObject(true)]));
			if (technosphere.isEmbedded) {
				promises.push(technosphere.delete());
			}
			return Promise.all(promises);
		} else {
			ui.notifications.error('FU.TechnospheresSlottingErrorNotTechnosphere', { localize: true });
		}
	}

	removeTechnosphere(technosphere) {
		const promises = [];
		const item = this.items.get(technosphere.id);
		if (item) {
			if (item.actor && slottableTypes.has(technosphere.type)) {
				const itemObject = item.toObject(true);
				promises.push(this.parent.actor.createEmbeddedDocuments('Item', [itemObject]));
			}
			promises.push(item.delete());
		}
		return Promise.all(promises);
	}
}
