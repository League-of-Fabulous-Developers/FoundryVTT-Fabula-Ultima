import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { ItemAttributesDataModelV2 } from '../common/item-attributes-data-model-v2.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { PseudoDocumentEnabledTypeDataModel } from '../../pseudo/enable-pseudo-documents-mixin.mjs';
import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../pseudo-item.mjs';
import { SETTINGS } from '../../../settings.js';

const slotsByQuality = {
	alpha: 1,
	beta: 2,
	gamma: 3,
	delta: 4,
};

const mnemospheresByQuality = {
	alpha: 1,
	beta: 1,
	gamma: 2,
	delta: 2,
};

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const prepareCheck = (check, actor, item, registerCallback) => {
	if (check.type === 'accuracy' && item.system instanceof CustomWeaponDataModel) {
		check.primary = item.system.attributes.primary;
		check.secondary = item.system.attributes.secondary;
		const baseAccuracy = item.system.accuracy;
		if (baseAccuracy) {
			check.modifiers.push({
				label: 'FU.AccuracyCheckBaseAccuracy',
				value: baseAccuracy,
			});
		}

		CheckConfiguration.configure(check)
			.setDamage(item.system.damage.type, item.system.damage.value)
			.setWeaponTraits({
				weaponType: item.system.type,
				weaponCategory: item.system.category,
				handedness: 'two-handed',
			})
			.addTraits(item.system.damage.type)
			.addTraits(...item.system.traits)
			.setTargetedDefense(item.system.defense)
			.setDamageOverride(actor, 'attack');
	}
};

Hooks.on(CheckHooks.prepareCheck, prepareCheck);

/**
 * @param {CheckRenderData} sections
 * @param {CheckResultV2} result
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
function onRenderCheck(sections, result, actor, item) {
	if (item && item.system instanceof CustomWeaponDataModel) {
		CommonSections.tags(
			sections,
			[
				{
					tag: 'FU.CustomWeapon',
					show: !item.system.isTransforming,
				},
				{
					tag: item.system.primaryForm.name || 'FU.CustomWeaponFormPrimary',
					show: item.system.isTransforming && item.system.activeForm === 'primaryForm',
				},
				{
					tag: item.system.secondaryForm.name || 'FU.CustomWeaponFormSecondary',
					show: item.system.activeForm === 'secondaryForm',
				},
				{
					tag: `FU.${item.system.category.capitalize()}`,
				},
				{
					tag: 'FU.TwoHanded',
				},
				{
					tag: `FU.${item.system.type.capitalize()}`,
				},
			],
			CHECK_DETAILS,
		);
		CommonSections.quality(sections, item.system.quality, CHECK_DETAILS);

		if (game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			sections.push({
				partial: 'projectfu.technospheres.chatSlotted',
				data: { slotted: item.system.slotted },
				order: CHECK_DETAILS,
			});
		} else {
			CommonSections.description(sections, item.system.description, item.system.summary, CHECK_DETAILS);
		}
	}
}

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {number} def
 * @property {number} mdef
 * @property {ItemAttributesDataModelV2} attributes
 * @property {number} accuracy
 * @property {number} damage.value
 * @property {DamageType} damage.type
 * @property {WeaponType} type
 * @property {WeaponCategory} category
 */
class CustomWeaponFormDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { SchemaField, StringField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			name: new StringField({ blank: true }),
			def: new NumberField({ initial: 0, integer: true, nullable: false }),
			mdef: new NumberField({ initial: 0, integer: true, nullable: false }),
			attributes: new EmbeddedDataField(ItemAttributesDataModelV2, {
				initial: {
					primary: 'dex',
					secondary: 'ins',
				},
			}),
			accuracy: new NumberField({ initial: 0, integer: true, nullable: false }),
			damage: new SchemaField({
				value: new NumberField({ initial: 5, integer: true, nullable: false }),
				type: new StringField({
					initial: 'physical',
					choices: Object.keys(FU.damageTypes),
					blank: true,
					nullable: false,
				}),
			}),
			type: new StringField({ initial: 'melee', choices: Object.keys(FU.weaponTypes) }),
			category: new StringField({ initial: 'brawling', choices: Object.keys(FU.weaponCategories) }),
		};
	}
}

/**
 * @property {string} summary
 * @property {string} description
 * @property {string} source
 * @property {boolean} isFavored
 * @property {boolean} showTitleCard
 * @property {number} cost
 * @property {boolean} isMartial
 * @property {string} quality
 * @property {Defense} defense
 * @property {boolean} isTransforming
 * @property {'primaryForm', 'secondaryForm'} activeForm
 * @property {CustomWeaponFormDataModel} primaryForm
 * @property {CustomWeaponFormDataModel} secondaryForm
 * @property {'alpha','beta','gamma','delta'} slots
 * @property {PseudoDocumentCollection} items
 */
export class CustomWeaponDataModel extends PseudoDocumentEnabledTypeDataModel {
	static defineSchema() {
		const { StringField, HTMLField, SchemaField, BooleanField, NumberField, EmbeddedDataField, SetField } = foundry.data.fields;
		return {
			summary: new StringField(),
			description: new HTMLField(),
			source: new StringField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			cost: new NumberField({ initial: 300, min: 0, integer: true, nullable: false }),
			isMartial: new BooleanField(),
			quality: new StringField(),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses) }),
			isTransforming: new BooleanField({ initial: false }),
			activeForm: new StringField({ initial: 'primaryForm', choices: ['primaryForm', 'secondaryForm'] }),
			primaryForm: new EmbeddedDataField(CustomWeaponFormDataModel),
			secondaryForm: new EmbeddedDataField(CustomWeaponFormDataModel),
			traits: new SetField(new StringField()),
			slots: new StringField({ initial: 'alpha', choices: ['alpha', 'beta', 'gamma', 'delta'] }),
			items: new PseudoDocumentCollectionField(PseudoItem),
		};
	}

	#computedPropertiesSetByActiveEffect;

	get computedPropertiesSetByActiveEffect() {
		return this.#computedPropertiesSetByActiveEffect;
	}

	prepareBaseData() {
		this.#computedPropertiesSetByActiveEffect = {};

		for (const key of ['def', 'mdef', 'accuracy', 'type', 'category']) {
			this.#setupDirectDelegate(key);
		}

		this.#setupObjectDelegate('attributes', ['primary', 'secondary']);
		this.#setupObjectDelegate('damage', ['value', 'type']);

		if (!this.isTransforming) {
			this.activeForm = 'primaryForm';
		}

		if (game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			this.quality = game.i18n.localize(FU.technospheres.weaponSlots[this.slots].label);
		}
	}

	prepareDerivedData() {
		this.slotted = this.items
			.filter((item) => ['mnemosphere', 'hoplosphere'].includes(item.type))
			.sort((left, right) => {
				if (left.type === 'mnemosphere' && right.type === 'hoplosphere') {
					return -1;
				}
				if (right.type === 'mnemosphere' && left.type === 'hoplosphere') {
					return 1;
				}
				return 0;
			});
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		return Checks.accuracyCheck(this.parent.actor, this.parent, CheckConfiguration.initHrZero(modifiers.shift));
	}

	get slotCount() {
		return slotsByQuality[this.slots];
	}

	get mnemosphereSlots() {
		return mnemospheresByQuality[this.slots];
	}

	/**
	 * @param {string} key
	 */
	#setupDirectDelegate(key) {
		const model = this;
		Object.defineProperty(model, key, {
			configurable: true,
			enumerable: true,
			get() {
				return model[model.activeForm][key];
			},
			set(newValue) {
				if (model.activeForm === 'primaryForm') {
					model.primaryForm[key] = newValue;
					foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.primaryForm.${key}`, newValue);
				} else {
					foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.primaryForm.${key}`, model.primaryForm[key]);
				}

				if (model.activeForm === 'secondaryForm') {
					model.secondaryForm[key] = newValue;
					foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.secondaryForm.${key}`, newValue);
				} else {
					foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.secondaryForm.${key}`, model.secondaryForm[key]);
				}
			},
		});
	}

	/**
	 * @param {string} baseKey
	 * @param {string[]} nestedKeys
	 */
	#setupObjectDelegate(baseKey, nestedKeys) {
		const model = this;
		const delegateObject = {};
		model[baseKey] = delegateObject;

		nestedKeys.forEach((key) => {
			Object.defineProperty(delegateObject, key, {
				configurable: true,
				enumerable: true,
				get() {
					return model[model.activeForm][baseKey][key];
				},
				set(newValue) {
					if (model.activeForm === 'primaryForm') {
						model.primaryForm[baseKey][key] = newValue;
						foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.primaryForm.${baseKey}.${key}`, newValue);
					} else {
						foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.primaryForm.${baseKey}.${key}`, model.primaryForm[baseKey][key]);
					}

					if (model.activeForm === 'secondaryForm') {
						model.secondaryForm[baseKey][key] = newValue;
						foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.secondaryForm.${baseKey}.${key}`, newValue);
					} else {
						foundry.utils.setProperty(model.#computedPropertiesSetByActiveEffect, `system.secondaryForm.${baseKey}.${key}`, model.secondaryForm[baseKey][key]);
					}
				},
			});
		});
	}

	transferEffects() {
		return this.parent.isEquipped && !this.parent.actor?.system.vehicle?.weaponsActive;
	}

	afterApplyActiveEffects() {
		foundry.utils.mergeObject(this.parent.overrides, this.#computedPropertiesSetByActiveEffect);
	}

	equipWeapon(event, target) {
		this.parent.actor.equipmentHandler.handleItemClick(event, target);
	}

	switchForm() {
		return this.parent.update({
			'system.activeForm': this.activeForm === 'primaryForm' ? 'secondaryForm' : 'primaryForm',
		});
	}

	inspectTechnosphere(event, target) {
		if (event.button !== 0) return;
		const itemId = target.closest('[data-technosphere-id]')?.dataset?.technosphereId;
		const item = this.items.get(itemId);
		if (item) {
			item.sheet.render({ force: true });
		}
	}
}
