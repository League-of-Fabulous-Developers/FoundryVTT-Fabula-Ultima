import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { RitualMigrations } from './ritual-migrations.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { ItemAttributesDataModelV2 } from '../common/item-attributes-data-model-v2.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';

/**
 * @type {PrepareCheckHook}
 */
const prepareCheck = (check, actor, item, registerCallback) => {
	if (item?.system instanceof RitualDataModel) {
		check.primary = item.system.attributes.primary;
		check.secondary = item.system.attributes.secondary;
		CheckConfiguration.configure(check).setDifficulty(item.system.dLevel.value);
	}
};

Hooks.on(CheckHooks.prepareCheck, prepareCheck);

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof RitualDataModel) {
		CommonSections.tags(
			sections,
			[
				{
					tag: 'FU.MindAbbr',
					value: item.system.mpCost.value,
					flip: true,
				},
				{
					tag: 'FU.DLAbbr',
					value: item.system.dLevel.value,
				},
				{
					tag: 'FU.Clock',
					value: item.system.progress.max,
					show: item.system.hasClock.value,
					flip: true,
				},
			],
			CHECK_DETAILS,
		);

		if (item.system.hasClock.value) {
			CommonSections.clock(sections, item.system.progress, CHECK_DETAILS);
		}

		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
	}
});

const AREA_COST_MULTI = { individual: 1, small: 2, large: 3, huge: 4 };

/**
 * @type {Record<"minor" | "medium" | "major" | "extreme", {cost: number, difficulty: number, clock: number}>}
 */
const POTENCIES = {
	minor: {
		cost: 20,
		difficulty: 7,
		clock: 4,
	},
	medium: {
		cost: 30,
		difficulty: 10,
		clock: 6,
	},
	major: {
		cost: 40,
		difficulty: 13,
		clock: 6,
	},
	extreme: {
		cost: 50,
		difficulty: 16,
		clock: 8,
	},
};

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {ItemAttributesDataModelV2} attributes
 * @property {number} modifier
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {"minor","medium","major","extreme"} potency.value
 * @property {'individual', 'small', 'large', 'huge'} area.value
 * @property {number} mpCost.value
 * @property {number} dLevel.value
 * @property {number} clock.value
 * @property {string} source.value
 * @property {boolean} hasRoll.value
 */
export class RitualDataModel extends FUStandardItemDataModel {
	static {
		deprecationNotice(this, 'class.value');
		deprecationNotice(this, 'useWeapon.accuracy.value');
		deprecationNotice(this, 'useWeapon.damage.value');
		deprecationNotice(this, 'useWeapon.hrZero.value');
		deprecationNotice(this, 'accuracy.value', 'modifier');
		deprecationNotice(this, 'damage.hasDamage.value');
		deprecationNotice(this, 'damage.value');
		deprecationNotice(this, 'damage.type.value');
		deprecationNotice(this, 'impdamage.hasImpDamage.value');
		deprecationNotice(this, 'impdamage.value');
		deprecationNotice(this, 'impdamage.impType.value');
		deprecationNotice(this, 'impdamage.type.value');
		deprecationNotice(this, 'rollInfo.impdamage.hasImpDamage.value');
		deprecationNotice(this, 'rollInfo.impdamage.value');
		deprecationNotice(this, 'rollInfo.impdamage.impType.value');
		deprecationNotice(this, 'rollInfo.impdamage.type.value');
		deprecationNotice(this, 'rollInfo.attributes.primary.value', 'attributes.primary');
		deprecationNotice(this, 'rollInfo.attributes.secondary.value', 'attributes.secondary');
		deprecationNotice(this, 'rollInfo.accuracy.value', 'modifier');
	}

	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			attributes: new EmbeddedDataField(ItemAttributesDataModelV2, { initial: { primary: 'ins', secondary: 'wlp' } }),
			modifier: new NumberField({ initial: 0, integer: true, nullable: false }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			potency: new SchemaField({ value: new StringField({ initial: 'minor', choices: Object.keys(FU.potency) }) }),
			area: new SchemaField({ value: new StringField({ initial: 'individual', choices: Object.keys(FU.area) }) }),
			hasRoll: new SchemaField({ value: new BooleanField() }),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source) ?? source;
		RitualMigrations.run(source);
		return source;
	}

	prepareBaseData() {
		const potency = POTENCIES[this.potency.value];
		const costMulti = AREA_COST_MULTI[this.area.value];

		(this.mpCost ??= {}).value = potency.cost * costMulti;
		(this.dLevel ??= {}).value = potency.difficulty;
		(this.clock ??= {}).value = potency.clock;
		this.progress.max = potency.clock;
	}

	async _preUpdate(changes, options, user) {
		const potency = foundry.utils.getProperty(changes, 'system.potency.value');
		if (potency) {
			foundry.utils.setProperty(changes, 'system.progress.max', POTENCIES[potency].clock);
		}
	}

	async roll() {
		if (this.hasRoll.value) {
			return Checks.magicCheck(this.parent.actor, this.parent);
		} else {
			return Checks.display(this.parent.actor, this.parent);
		}
	}

	get attributePartials() {
		return [ItemPartialTemplates.controls, ItemPartialTemplates.ritual, ItemPartialTemplates.progressField];
	}
}
