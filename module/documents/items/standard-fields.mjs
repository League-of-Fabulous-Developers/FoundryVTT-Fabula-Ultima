import { ActionCostDataModel } from './common/action-cost-data-model.mjs';
import { ItemAttributesDataModelV2 } from './common/item-attributes-data-model-v2.mjs';
import { UseWeaponDataModelV2 } from './common/use-weapon-data-model-v2.mjs';
import { FU } from '../../helpers/config.mjs';
import { DamageDataModelV2 } from './common/damage-data-model-v2.mjs';
import { EffectApplicationDataModel } from './common/effect-application-data-model.mjs';
import { ResourceDataModel } from './common/resource-data-model.mjs';
import { ProgressDataModel } from './common/progress-data-model.mjs';
import { TargetingDataModel } from './common/targeting-data-model.mjs';
import { ItemPartialTemplates } from './item-partial-templates.mjs';

const { SetField, StringField, EmbeddedDataField, SchemaField, BooleanField } = foundry.data.fields;

/**
 * @callback FieldSupplier
 * @return {Record<string, DataField>}
 */

/**
 * @typedef {FieldSupplier & FUPartialTemplate} FieldSupplierWithTemplate
 */

/**
 * @param {FieldSupplier} fn
 * @param {FUPartialTemplate} template
 * @return FieldSupplierWithTemplate
 */
const assignTemplate = (fn, template) => Object.assign(fn, template);

/**
 * @type FieldSupplierWithTemplate
 */
const traits = assignTemplate(
	() => ({
		traits: new SetField(new StringField()),
	}),
	ItemPartialTemplates.traitsLegacy,
);

/**
 * @type FieldSupplierWithTemplate
 */
const cost = assignTemplate(
	() => ({
		cost: new EmbeddedDataField(ActionCostDataModel, {}),
	}),
	ItemPartialTemplates.actionCost,
);

/**
 * @private
 * used to make sure other functions define the same fields exactly the same
 */
const _useWeapon = () => ({
	useWeapon: new EmbeddedDataField(UseWeaponDataModelV2, {}),
});

/**
 * @type FieldSupplierWithTemplate
 */
const hasRollAccuracyDefense = assignTemplate(
	() => ({
		..._useWeapon(),
		hasRoll: new SchemaField({ value: new BooleanField() }),
		attributes: new EmbeddedDataField(ItemAttributesDataModelV2, {
			initial: {
				primary: 'dex',
				secondary: 'ins',
			},
		}),
		accuracy: new StringField({ nullable: false }),
		defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses), blank: true }),
	}),
	ItemPartialTemplates.accuracy,
);

/**
 * @type FieldSupplierWithTemplate
 */
const damage = assignTemplate(
	() => ({
		..._useWeapon(),
		damage: new EmbeddedDataField(DamageDataModelV2, {}),
	}),
	ItemPartialTemplates.damage,
);

/**
 * @type FieldSupplierWithTemplate
 */
const effects = assignTemplate(
	() => ({
		effects: new EmbeddedDataField(EffectApplicationDataModel, {}),
	}),
	ItemPartialTemplates.effects,
);

/**
 * @type FieldSupplierWithTemplate
 */
const resource = assignTemplate(
	() => ({
		resource: new EmbeddedDataField(ResourceDataModel, {}),
	}),
	ItemPartialTemplates.resource,
);

/**
 * @type FieldSupplierWithTemplate
 */
const resourcePoints = assignTemplate(
	() => ({
		hasResource: new SchemaField({ value: new BooleanField() }),
		rp: new EmbeddedDataField(ProgressDataModel, {}),
	}),
	ItemPartialTemplates.resourcePoints,
);

/**
 * @type FieldSupplierWithTemplate
 */
const targeting = assignTemplate(
	() => ({
		targeting: new EmbeddedDataField(TargetingDataModel, {}),
	}),
	ItemPartialTemplates.targeting,
);

export const StandardFields = {
	traits,
	cost,
	hasRollAccuracyDefense,
	damage,
	effects,
	resource,
	resourcePoints,
	targeting,
};
