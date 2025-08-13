import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { SETTINGS } from '../../../settings.js';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof ProjectDataModel) {
		CommonSections.tags(sections, [
			{
				tag: game.settings.get(SYSTEM, SETTINGS.optionRenameCurrency),
				value: item.system.cost.value - item.system.discount.value,
				flip: true,
				tooltip: item.system.discount.value && `${item.system.cost.value} - ${item.system.discount.value} = ${item.system.cost.value - item.system.discount.value}`,
			},
			{
				tag: 'FU.Progress',
				value: `${item.system.progress.current} / ${item.system.progress.max}`,
				flip: true,
			},
			{
				tag: 'FU.Days',
				value: item.system.days.value,
				flip: true,
			},
			{
				tag: 'FU.ProgressPerDay',
				value: item.system.progressPerDay.value,
				flip: true,
			},
		]);

		CommonSections.description(sections, item.system.description, item.system.summary.value);
	}
});

const potencyCosts = { minor: 100, medium: 200, major: 400, extreme: 800 };
const areaCosts = { individual: 1, small: 2, large: 3, huge: 4 };
const usesCosts = { consumable: 1, permanent: 5 };

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
export class ProjectDataModel extends FUStandardItemDataModel {
	static {
		deprecationNotice(this, 'clock.value');
		deprecationNotice(this, 'hasClock.value');
		deprecationNotice(this, 'defectMod.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			potency: new SchemaField({ value: new StringField({ initial: 'minor', choices: Object.keys(FU.potency) }) }),
			area: new SchemaField({ value: new StringField({ initial: 'individual', choices: Object.keys(FU.area) }) }),
			use: new SchemaField({ value: new StringField({ initial: 'consumable', choices: Object.keys(FU.uses) }) }),
			isFlawed: new SchemaField({ value: new BooleanField() }),
			numTinker: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			numHelper: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			lvlVision: new SchemaField({ value: new NumberField({ initial: 0, min: 0, max: 5, integer: true, nullable: false }) }),
		});
	}

	prepareBaseData() {
		// Update system values
		(this.cost ??= {}).value = this.#calculateCost(this.potency.value, this.area.value, this.use.value, this.isFlawed.value);
		this.progress.max = this.#calculateProgress(this.cost.value);
		(this.discount ??= {}).value = this.lvlVision.value * 100;
		(this.progressPerDay ??= {}).value = this.#calculateDailyProgress(this.numTinker.value, this.numHelper.value, this.lvlVision.value);
		(this.days ??= {}).value = Math.ceil(this.progress.max / (this.numTinker.value * 2 + this.numHelper.value + this.lvlVision.value));
	}

	/**
	 * @param {"minor", "medium", "major", "extreme"} potency
	 * @param {"individual", "small", "large", "huge"} area
	 * @param {"consumable", "permanent"} uses
	 * @param {boolean} flawed
	 * @return {number}
	 */
	#calculateCost(potency, area, uses, flawed) {
		return potencyCosts[potency] * areaCosts[area] * usesCosts[uses] * (flawed ? 0.75 : 1);
	}

	/**
	 * @param {number} cost
	 * @return {number}
	 */
	#calculateProgress(cost) {
		return Math.max(Math.floor(cost / 100), 1);
	}

	/**
	 * @param {number} tinkerers
	 * @param {number} helpers
	 * @param {number} visionaryLevels
	 * @return {number}
	 */
	#calculateDailyProgress(tinkerers, helpers, visionaryLevels) {
		return tinkerers * 2 + helpers + visionaryLevels;
	}

	async _preUpdate(changes, options, user) {
		const costRelevantKeys = ['system.potency.value', 'system.area.value', 'system.use.value', 'system.isFlawed.value'];
		if (costRelevantKeys.some((key) => foundry.utils.hasProperty(changes, key))) {
			const params = costRelevantKeys.map((key) => (foundry.utils.hasProperty(changes, key) ? foundry.utils.getProperty(changes, key) : foundry.utils.getProperty(this.parent, key)));
			foundry.utils.setProperty(changes, 'system.progress.max', this.#calculateProgress(this.#calculateCost(...params)));
		}

		const dailyProgressRelevantKeys = ['system.numTinker.value', 'system.numHelper.value', 'system.lvlVision.value'];
		if (dailyProgressRelevantKeys.some((key) => foundry.utils.hasProperty(changes, key))) {
			const params = dailyProgressRelevantKeys.map((key) => (foundry.utils.hasProperty(changes, key) ? foundry.utils.getProperty(changes, key) : foundry.utils.getProperty(this.parent, key)));
			foundry.utils.setProperty(changes, 'system.progress.step', this.#calculateDailyProgress(...params));
		}
	}

	get attributePartials() {
		return [ItemPartialTemplates.controls, ItemPartialTemplates.flawedField, ItemPartialTemplates.project];
	}
}
