import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU } from '../../../../helpers/config.mjs';

/**
 * @extends foundry.abstract.DataModel
 * @property {string} name
 * @property {string} description
 * @property {number} extraDamage
 * @property {"",DamageType} changedDamageType
 */
class InfusionDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, NumberField } = foundry.data.fields;
		return {
			name: new StringField({ initial: '' }),
			description: new StringField({ initial: '' }),
			extraDamage: new NumberField({ initial: 5, min: 0 }),
			changedDamageType: new StringField({ initial: '', blank: true, choices: [...Object.keys(FU.damageTypes)] }),
		};
	}
}

/**
 * @extends ClassFeatureDataModel
 * @property {"basic","advanced","superior"} rank
 * @property {string} description
 * @property {InfusionDataModel[]} basicInfusions
 * @property {InfusionDataModel[]} advancedInfusions
 * @property {InfusionDataModel[]} superiorInfusions
 */
export class InfusionsDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField, ArrayField, EmbeddedDataField } = foundry.data.fields;
		return {
			rank: new StringField({
				initial: 'basic',
				nullable: false,
				blank: true,
				choices: ['basic', 'advanced', 'superior'],
			}),
			description: new HTMLField(),
			basicInfusions: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
			advancedInfusions: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
			superiorInfusions: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-infusions-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-gadgets-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureInfusions';
	}

	static getAdditionalData() {
		return {
			ranks: {
				basic: 'FU.ClassFeatureGadgetsRankBasic',
				advanced: 'FU.ClassFeatureGadgetsRankAdvanced',
				superior: 'FU.ClassFeatureGadgetsRankSuperior',
			},
			damageTypes: FU.damageTypes,
		};
	}

	/** @override */
	static getTabConfigurations() {
		return [
			{
				group: 'infusionTabs',
				navSelector: '.infusion-tabs',
				contentSelector: '.infusion-content',
				initial: 'description',
			},
		];
	}

	static activateListeners(html, item) {
		html.find('[data-action=addInfusion][data-rank]').click(() => {
			const rank = event.currentTarget.dataset.rank;
			item.update({
				[`system.data.${rank}`]: [...item.system.data[rank], {}],
			});
		});
		html.find('[data-action=deleteInfusion][data-rank][data-index]').click((event) => {
			const rank = event.currentTarget.dataset.rank;
			const idx = event.currentTarget.dataset.index;
			item.update({ [`system.data.${rank}`]: item.system.data[rank].toSpliced(idx, 1) });
		});
	}

	static processUpdateData(data) {
		for (const field of ['basicInfusions', 'advancedInfusions', 'superiorInfusions']) {
			this.#processInfusions(field, data);
		}
		return data;
	}

	/**
	 * Convert object to array
	 */
	static #processInfusions(key, data) {
		let value = data[key];
		if (value && !Array.isArray(value)) {
			const infusions = [];
			const maxIndex = Object.keys(value).length;
			for (let i = 0; i < maxIndex; i++) {
				infusions.push(data[i]);
			}
			data[key] = infusions;
		}
	}
}
