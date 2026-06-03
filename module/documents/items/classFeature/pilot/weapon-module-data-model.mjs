import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { SETTINGS } from '../../../../settings.js';
import { Checks } from '../../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../../checks/check-configuration.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { ClassFeatureTypeDataModel } from '../class-feature-type-data-model.mjs';
import { CHECK_DETAILS } from '../../../../checks/default-section-order.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { WeaponBehaviourMixin } from '../../weapon/weapon-behaviour-mixin.mjs';
import { Traits } from '../../../../pipelines/traits.mjs';

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
		const weapon = item.system.data;
		check.primary = weapon.accuracy.attr1;
		check.secondary = weapon.accuracy.attr2;
		const baseAccuracy = weapon.accuracy.modifier;
		if (baseAccuracy) {
			check.modifiers.push({
				label: 'FU.AccuracyCheckBaseAccuracy',
				value: baseAccuracy,
			});
		}

		CheckConfiguration.configure(check)
			.setDamage(weapon.damage.type, weapon.damage.bonus)
			.setWeaponTraits({
				weaponType: weapon.type,
				weaponCategory: weapon.category,
				handedness: weapon.handedness,
			})
			.addTraits(Traits.Damage)
			.addTraits(weapon.damage.type)
			.addTraitsFromItemModel(weapon.traits)
			.setTargetedDefense(weapon.accuracy.defense)
			.setDamageOverride(actor, 'attack');
	}
};

Hooks.on(CheckHooks.prepareCheck, prepareCheck);

/** @type RenderCheckHook */
const onRenderCheck = (data, result, actor, item) => {
	if (item && item.system instanceof ClassFeatureTypeDataModel && item.system.data instanceof WeaponModuleDataModel) {
		/** @type WeaponModuleDataModel */
		const weaponModule = item.system.data;
		data.sections.push(async () => ({
			order: CHECK_DETAILS,
			partial: 'systems/projectfu/templates/chat/partials/chat-weapon-details.hbs',
			data: {
				weapon: {
					category: weaponModule.category,
					hands: weaponModule.handedness,
					type: weaponModule.type,
					quality: weaponModule.quality,
					summary: item.system.summary.value,
					description: await TextEditor.enrichHTML(item.system.description),
				},
				optionChatMessageCollapseDescription: game.settings.get(SYSTEM, SETTINGS.optionChatMessageCollapseDescription),
			},
		}));
	}
};

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
 * @property {Set<String>} traits
 * @property {string} description
 */
export class WeaponModuleDataModel extends WeaponBehaviourMixin(RollableClassFeatureDataModel) {
	static defineSchema() {
		const { SchemaField, StringField, NumberField, BooleanField, HTMLField, SetField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
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
			cost: new NumberField({ initial: 500, min: 0, integer: true, nullable: false }),
			quality: new StringField(),
			shield: new SchemaField({
				defense: new NumberField({ initial: 2 }),
				magicDefense: new NumberField({ initial: 2 }),
			}),
			description: new HTMLField(),
			traits: new SetField(new StringField()),
		});
	}

	static get template() {
		return 'systems/projectfu/templates/feature/pilot/weapon-module-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/pilot/weapon-module-preview.hbs';
	}

	static get expandTemplate() {
		return 'systems/projectfu/templates/feature/pilot/weapon-module-expand.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureWeaponModule';
	}

	/**
	 * @returns {Handedness}
	 */
	get handedness() {
		return 'one-handed';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			attributes: FU.attributeAbbreviations,
			damageTypes: FU.damageTypes,
			weaponTypes: weaponModuleTypes,
			weaponCategories: FU.weaponCategoriesWithoutCustom,
			vehicle: model.actor?.system.vehicle?.vehicle,
			active: model.actor?.system.vehicle?.weapons.includes(model.item) ?? false,
			defenses: FU.defenses,
		};
	}

	static get canStash() {
		return true;
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
		return this.actor.system.vehicle?.embarked && this.actor.system.vehicle.weapons.includes(this.item);
	}
}
