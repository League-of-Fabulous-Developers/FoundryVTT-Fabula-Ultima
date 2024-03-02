import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { createCheckMessage, rollCheck } from '../../../../helpers/checks.mjs';

export class MagitechDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField } = foundry.data.fields;
		return {
			rank: new StringField({
				initial: 'basic',
				nullable: false,
				blank: true,
				choices: ['basic', 'advanced', 'superior'],
			}),
			description: new HTMLField(),
			basic: new HTMLField(),
			advanced: new HTMLField(),
			superior: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-magitech-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-gadgets-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureMagitech';
	}

	static getAdditionalData() {
		return {
			ranks: {
				basic: 'FU.ClassFeatureGadgetsRankBasic',
				advanced: 'FU.ClassFeatureGadgetsRankAdvanced',
				superior: 'FU.ClassFeatureGadgetsRankSuperior',
			},
		};
	}

	/** @override */
	static getTabConfigurations() {
		return [
			{
				group: 'magitechTabs',
				navSelector: '.magitech-tabs',
				contentSelector: '.magitech-content',
				initial: 'description',
			},
		];
	}

	/**
	 * @param {MagitechDataModel} model
	 * @return {Promise<void>}
	 */
	static async roll(model) {
		const currentIns = model.parent.parent.actor.system.attributes.ins.current;
		/** @type CheckParameters */
		const check = {
			check: {
				title: game.i18n.localize('FU.ClassFeatureMagitechOverride'),
				attr1: {
					attribute: 'ins',
					dice: currentIns,
				},
				attr2: {
					attribute: 'ins',
					dice: currentIns,
				},
				modifier: 0,
				bonus: 0,
			},
		};
		rollCheck(check).then((value) => createCheckMessage(value));
	}
}
