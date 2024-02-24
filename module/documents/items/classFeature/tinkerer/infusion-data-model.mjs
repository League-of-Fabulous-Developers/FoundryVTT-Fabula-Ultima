import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU } from '../../../../helpers/config.mjs';

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
			basic: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
			advanced: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
			superior: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
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
				group: 'gadgetBenefits',
				navSelector: '.gadget-tabs',
				contentSelector: '.gadget-content',
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
		if (data.basic && !Array.isArray(data.basic)) {
			data.basic = this.#processInfusions(data.basic);
		}
		if (data.advanced && !Array.isArray(data.advanced)) {
			data.advanced = this.#processInfusions(data.advanced);
		}
		if (data.superior && !Array.isArray(data.superior)) {
			data.superior = this.#processInfusions(data.superior);
		}
		return data;
	}

	static #processInfusions(data) {
		const infusions = [];
		const maxIndex = Object.keys(data).length;
		for (let i = 0; i < maxIndex; i++) {
			infusions.push(data[i]);
		}
		return infusions;
	}
}
