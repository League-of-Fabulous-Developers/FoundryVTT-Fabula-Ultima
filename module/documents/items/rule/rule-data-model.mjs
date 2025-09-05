import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof RuleDataModel) {
		if (item.system.hasClock.value) {
			CommonSections.clock(sections, item.system.progress);
		}

		CommonSections.description(sections, item.system.description, item.system.summary.value);
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {string} source
 */
export class RuleDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
		});
	}

	get attributePartials() {
		return [ItemPartialTemplates.standard, ItemPartialTemplates.progressField];
	}

	updateClock(event, target) {
		if (target.closest('[data-clock-action]')) {
			let amount = target.closest('[data-clock-action]').dataset.clockAction === 'erase' ? -1 : 1;

			if (event.type === 'contextmenu') {
				amount *= this.progress.step;
			}

			const newValue = this.progress.current + amount;

			return this.parent.update({
				'system.progress.current': Math.clamp(newValue, 0, this.progress.max),
			});
		}

		if (target.closest('[data-segment]')) {
			let newValue = target.closest('[data-segment]').dataset.segment;
			if (event.type === 'contextmenu') {
				newValue = newValue - 1;
			}

			return this.parent.update({
				'system.progress.current': Math.clamp(newValue, 0, this.progress.max),
			});
		}
	}
}
