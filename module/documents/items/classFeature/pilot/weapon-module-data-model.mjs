import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { SETTINGS } from '../../../../settings.js';
import { Checks } from '../../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../../checks/check-configuration.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { ClassFeatureTypeDataModel } from '../class-feature-type-data-model.mjs';
import { CHECK_DETAILS } from '../../../../checks/default-section-order.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

const weaponModuleTypes = {
	...FU.weaponTypes,
	shield: 'FU.Shield',
};

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const prepareCheck = (check, actor, item, registerCallback) => {
	if (check.type === 'accuracy' && item.system instanceof ClassFeatureTypeDataModel && item.system.data instanceof WeaponModuleDataModel) {
		/** @type WeaponModuleDataModel */
		const module = item.system.data;
		check.primary = module.accuracy.attr1;
		check.secondary = module.accuracy.attr2;
		const baseAccuracy = module.accuracy.modifier;
		if (baseAccuracy) {
			check.modifiers.push({
				label: 'FU.AccuracyCheckBaseAccuracy',
				value: baseAccuracy,
			});
		}

		const configurer = CheckConfiguration.configure(check);
		configurer.setDamage(module.damage.type, module.damage.bonus);
		configurer.setWeaponTraits({
			weaponType: module.type,
			weaponCategory: module.category,
		});
		configurer.setTargetedDefense(module.accuracy.defense);
		configurer.setDamageOverride(actor, 'attack');
	}
};

Hooks.on(CheckHooks.prepareCheck, prepareCheck);

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} result
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
function onRenderCheck(data, result, actor, item) {
	if (item && item.system instanceof ClassFeatureTypeDataModel && item.system.data instanceof WeaponModuleDataModel) {
		/** @type WeaponModuleDataModel */
		const weaponModule = item.system.data;
		data.push(async () => ({
			order: CHECK_DETAILS,
			partial: 'systems/projectfu/templates/chat/partials/chat-weapon-details.hbs',
			data: {
				weapon: {
					category: weaponModule.category,
					hands: 'one-handed',
					type: weaponModule.type,
					quality: weaponModule.quality,
					summary: item.system.summary.value,
					description: await TextEditor.enrichHTML(item.system.description),
				},
				optionChatMessageCollapseDescription: game.settings.get(SYSTEM, SETTINGS.optionChatMessageCollapseDescription),
			},
		}));
	}
}

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @extends RollableClassFeatureDataModel
 * @property {Object} accuracy
 * @property {"dex","ins","mig","wlp"} accuracy.attr1
 * @property {"dex","ins","mig","wlp"} accuracy.attr2
 * @property {number} accuracy.modifier
 * @property {"def", "mdef"} accuracy.defense
 * @property {Object} damage
 * @property {"physical","air","bolt","dark","earth","fire","ice","light","poison"} damage.type
 * @property {number} damage.bonus
 * @property {"melee","ranged","shield"} type
 * @property {"arcane", "bow", "brawling", "dagger", "firearm", "flail", "heavy", "spear", "sword", "thrown"} category
 * @property {boolean} complex
 * @property {string} quality
 * @property {Object} shield
 * @property {number} shield.defense
 * @property {number} shield.magicDefense
 * @property {string} description
 */
export class WeaponModuleDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { SchemaField, StringField, NumberField, BooleanField, HTMLField } = foundry.data.fields;
		return {
			accuracy: new SchemaField({
				attr1: new StringField({ initial: 'dex', choices: () => Object.keys(CONFIG.FU.attributeAbbreviations) }),
				attr2: new StringField({ initial: 'ins', choices: () => Object.keys(CONFIG.FU.attributeAbbreviations) }),
				modifier: new NumberField({ initial: 0 }),
				defense: new StringField({ initial: 'def', choices: () => Object.keys(CONFIG.FU.defenses) }),
			}),
			damage: new SchemaField({
				type: new StringField({ initial: 'physical', choices: Object.keys(CONFIG.FU.damageTypes) }),
				bonus: new NumberField({ initial: 0 }),
			}),
			type: new StringField({ initial: 'melee', choices: Object.keys(weaponModuleTypes) }),
			category: new StringField({
				initial: 'arcane',
				choices: Object.keys(CONFIG.FU.weaponCategoriesWithoutCustom),
			}),
			complex: new BooleanField(),
			quality: new StringField(),
			shield: new SchemaField({
				defense: new NumberField({ initial: 2 }),
				magicDefense: new NumberField({ initial: 2 }),
			}),
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/pilot/weapon-module-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/pilot/weapon-module-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureWeaponModule';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			attributes: FU.attributeAbbreviations,
			damageTypes: FU.damageTypes,
			weaponTypes: weaponModuleTypes,
			weaponCategories: FU.weaponCategoriesWithoutCustom,
			vehicle: model.actor?.system.vehicle.vehicle,
			active: model.actor?.system.vehicle?.weapons.includes(model.item) ?? false,
			defenses: FU.defenses,
		};
	}

	/**
	 * @override
	 */
	static roll(model, item, hrZero) {
		if (model.isShield) {
			Checks.display(item.actor, item);
		} else {
			Checks.accuracyCheck(item.actor, item, CheckConfiguration.initHrZero(hrZero));
		}
	}

	get isShield() {
		return this.type === 'shield';
	}

	/**
	 * Override `complex` for shields, since complex shields don't really make sense.
	 */
	prepareData() {
		if (this.isShield) {
			this.complex = false;
		}
	}

	transferEffects() {
		return this.actor.system.vehicle.embarked && this.actor.system.vehicle.weapons.includes(this.item);
	}
}
