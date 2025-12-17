import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CheckConfiguration, DamageData } from '../../../checks/check-configuration.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';
import { FUSubTypedItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { ActionCostDataModel } from '../common/action-cost-data-model.mjs';
import { ResourceDataModel } from '../common/resource-data-model.mjs';
import { InlineSourceInfo } from '../../../helpers/inline-helper.mjs';
import { DamagePipeline } from '../../../pipelines/damage-pipeline.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { ConsumableTraits, TraitUtils } from '../../../pipelines/traits.mjs';

import { TraitsDataModel } from '../common/traits-data-model.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item, flags) => {
	if (item?.system instanceof ConsumableDataModel) {
		/** @type ConsumableDataModel **/

		CommonSections.tags(sections, [{ tag: FU.consumableType[item.system.subtype.value] }, { tag: 'FU.InventoryAbbr', value: item.system.ipCost.value, flip: true }]);
		CommonSections.description(sections, item.system.description, item.system.summary.value);
		const config = CheckConfiguration.configure(check);

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
 * @typedef {"damage", "restore"} FUConsumableAction

 */

/**
 * @property {Number} amount
 * @property {FUResourceType} resourceType
 */
export class ConsumableBuilder {}

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {number} ipCost.value
 * @property {string} source.value
 * @property {BasicDamageDataModel} damage
 * @property {ResourceDataModel} resource
 * @property {TraitsDataModel} traits
 */
export class ConsumableDataModel extends FUSubTypedItemDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			ipCost: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
			damage: new EmbeddedDataField(BasicDamageDataModel, {}),
			resource: new EmbeddedDataField(ResourceDataModel, {}),
			traits: new EmbeddedDataField(TraitsDataModel, {
				options: TraitUtils.getOptions(ConsumableTraits),
			}),
		});
	}

	get attributePartials() {
		return [ItemPartialTemplates.standard, ItemPartialTemplates.ipCostField, ItemPartialTemplates.behaviorField, ItemPartialTemplates.damageBasic, ItemPartialTemplates.resource, ItemPartialTemplates.traits];
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		return Checks.display(this.parent.actor, this.parent, this.#initializeCheck(modifiers));
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 */
	#initializeCheck(modifiers) {
		return async (check, actor, item) => {
			const config = CheckConfiguration.configure(check);
			const consumable = item.system;
			const targets = config.getTargetsOrDefault();
			const sourceInfo = InlineSourceInfo.fromInstance(actor, item);

			let builder = new ConsumableBuilder();
			if (consumable.resource.enabled) {
				builder.action = 'resource';
				builder.amount = consumable.resource.amount;
				builder.resourceType = consumable.resource.type;
				await CommonEvents.createConsumable(actor, item, targets, builder);
				config.setResource(consumable.resource.type, builder.amount);
			}
			if (consumable.damage.enabled) {
				builder.action = 'damage';
				builder.amount = consumable.damage.amount;
				await CommonEvents.createConsumable(actor, item, targets, builder);
				for (const type of consumable.damage.types) {
					const data = DamageData.construct(type, builder.amount);
					config.addTargetedAction(DamagePipeline.getTargetedAction(data, sourceInfo));
				}
			}
		};
	}
}
