import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { SETTINGS } from '../../../settings.js';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof ProjectDataModel) {
		sections.push({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-tags.hbs',
			data: {
				tags: [
					{
						tag: `${item.system.cost.value - item.system.discount.value} ${game.settings.get(SYSTEM, SETTINGS.optionRenameCurrency)}`,
						tooltip: item.system.discount.value && `${item.system.cost.value} - ${item.system.discount.value} = ${item.system.cost.value - item.system.discount.value}`,
					},
					{
						tag: `${item.system.progress.current} / ${item.system.progress.max}  ${game.i18n.localize('FU.Progress')}`,
					},
					{
						tag: `${item.system.days.value} ${game.i18n.localize('FU.Days')}`,
					},
					{
						tag: `${item.system.progressPerDay.value} ${game.i18n.localize('FU.ProgressPerDay')}`,
					},
				],
			},
		});

		if (item.system.summary.value || item.system.description) {
			sections.push(async () => ({
				partial: 'systems/projectfu/templates/chat/partials/chat-item-description.hbs',
				data: {
					summary: item.system.summary.value,
					description: await TextEditor.enrichHTML(item.system.description),
				},
			}));
		}
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {"minor", "medium","major", "extreme"} potency.value
 * @property {"individual", "small", "large", "huge"} area.value
 * @property {"consumable", "permanent"} use.value
 * @property {boolean} isFlawed.value
 * @property {number} defectMod.value
 * @property {number} numTinker.value
 * @property {number} numHelper.value
 * @property {number} lvlVision.value
 * @property {number} cost.value
 * @property {number} progressPerDay.value
 * @property {number} days.value
 * @property {number} discount.value
 * @property {number} clock.value
 * @property {string} clock.value
 */
export class ProjectDataModel extends foundry.abstract.TypeDataModel {
	static {
		deprecationNotice(this, 'clock.value');
		deprecationNotice(this, 'hasClock.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			potency: new SchemaField({ value: new StringField({ initial: 'minor', choices: Object.keys(FU.potency) }) }),
			area: new SchemaField({ value: new StringField({ initial: 'individual', choices: Object.keys(FU.area) }) }),
			use: new SchemaField({ value: new StringField({ initial: 'consumable', choices: Object.keys(FU.uses) }) }),
			isFlawed: new SchemaField({ value: new BooleanField() }),
			defectMod: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			numTinker: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			numHelper: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			lvlVision: new SchemaField({ value: new NumberField({ initial: 0, min: 0, max: 5, integer: true, nullable: false }) }),
			source: new SchemaField({ value: new StringField() }),
		};
	}

	prepareBaseData() {
		const potencyCosts = { minor: 100, medium: 200, major: 400, extreme: 800 };
		const areaCosts = { individual: 1, small: 2, large: 3, huge: 4 };
		const usesCosts = { consumable: 1, permanent: 5 };

		const flawedMod = this.isFlawed.value ? 0.75 : 1;

		// Update system values
		(this.cost ??= {}).value = potencyCosts[this.potency.value] * areaCosts[this.area.value] * usesCosts[this.use.value] * flawedMod;
		this.progress.max = Math.max(Math.ceil(this.cost.value / 100), 1);
		(this.discount ??= {}).value = this.lvlVision.value * 100;
		(this.progressPerDay ??= {}).value = this.numTinker.value * 2 + this.numHelper.value + this.lvlVision.value;
		(this.days ??= {}).value = Math.ceil(this.progress.max / (this.numTinker.value * 2 + this.numHelper.value + this.lvlVision.value));
	}
}
