import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CheckConfiguration, DamageData } from '../../../checks/check-configuration.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';
import { FUSubTypedItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { ActionCostDataModel } from '../common/action-cost-data-model.mjs';
import { ResourceDataModel } from '../common/resource-data-model.mjs';
import { ResourcePipeline, ResourceRequest } from '../../../pipelines/resource-pipeline.mjs';
import { InlineSourceInfo } from '../../../helpers/inline-helper.mjs';
import { DamagePipeline } from '../../../pipelines/damage-pipeline.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item, flags) => {
	if (item?.system instanceof ConsumableDataModel) {
		/** @type ConsumableDataModel **/
		const consumable = item.system;

		CommonSections.tags(sections, [{ tag: FU.consumableType[item.system.subtype.value] }, { tag: 'FU.InventoryAbbr', value: item.system.ipCost.value, flip: true }]);
		CommonSections.description(sections, item.system.description, item.system.summary.value);
		const config = CheckConfiguration.configure(check);
		const sourceInfo = InlineSourceInfo.fromInstance(actor, item);
		if (consumable.resource.enabled) {
			const request = new ResourceRequest(sourceInfo, config.getTargets(), consumable.resource.type, consumable.resource.amount);
			config.addTargetedAction(ResourcePipeline.getTargetedAction(request));
		}
		if (consumable.damage.enabled) {
			for (const type of consumable.damage.types) {
				const data = DamageData.construct(type, consumable.damage.amount);
				config.addTargetedAction(DamagePipeline.getTargetedAction(data, sourceInfo));
			}
		}
		const targets = config.getTargetsOrDefault();
		CommonSections.targeted(sections, actor, item, targets, flags, config);
		const cost = new ActionCostDataModel({ resource: 'ip', amount: item.system.ipCost.value, perTarget: false });
		CommonSections.spendResource(sections, actor, item, cost, [], flags);

		CommonEvents.item(actor, item);
	}
});

/**
 * @property {boolean} enabled
 * @property {number} amount The base value.
 * @property {String} onApply An expression which is evaluated during damage application.
 * @property {Set<DamageType>} types
 */
export class BasicDamageDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField, NumberField, StringField, SetField } = foundry.data.fields;
		return {
			enabled: new BooleanField(),
			amount: new NumberField({ initial: 0, integer: true, nullable: false }),
			onApply: new StringField({ blank: true }),
			types: new SetField(new StringField()),
		};
	}
}

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {number} ipCost.value
 * @property {string} source.value
 * @property {BasicDamageDataModel} damage
 * @property {ResourceDataModel} resource
 */
export class ConsumableDataModel extends FUSubTypedItemDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			ipCost: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
			damage: new EmbeddedDataField(BasicDamageDataModel, {}),
			resource: new EmbeddedDataField(ResourceDataModel, {}),
		});
	}

	get attributePartials() {
		return [ItemPartialTemplates.standard, ItemPartialTemplates.ipCostField, ItemPartialTemplates.behaviorField, ItemPartialTemplates.damageBasic, ItemPartialTemplates.resource];
	}
}
