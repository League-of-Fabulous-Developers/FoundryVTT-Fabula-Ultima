import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item, flags) => {
	if (item?.system instanceof ConsumableDataModel) {
		CommonSections.tags(sections, [{ tag: FU.consumableType[item.system.subtype.value] }, { tag: 'FU.InventoryAbbr', value: item.system.ipCost.value, flip: true }]);
		CommonSections.description(sections, item.system.description, item.system.summary.value);
		const targets = CheckConfiguration.inspect(check).getTargetsOrDefault();
		CommonSections.targeted(sections, actor, item, targets, flags);
		CommonSections.spendResource(sections, actor, item, [], flags);

		CommonEvents.item(actor, item);
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {number} ipCost.value
 * @property {string} source.value
 */
export class ConsumableDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField({ initial: 'potion', choices: Object.keys(FU.consumableType) }) }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			ipCost: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
			source: new SchemaField({ value: new StringField() }),
		};
	}

	/**
	 * Get the display data for an item.
	 *
	 * @returns {object|boolean} An object containing item display information, or false if this is not an item.
	 * @property {string} qualityString - The item's summary.
	 */
	getItemDisplayData() {
		// Retrieve and process the item's summary
		const summary = this.summary.value?.trim() || '';
		const qualityString = summary || game.i18n.localize('FU.SummaryNone');

		return {
			qualityString,
		};
	}
}
