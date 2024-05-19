import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { createCheckMessage, rollCheck } from '../../../../helpers/checks.mjs';

const weaponModuleTypes = {
	...FU.weaponTypes,
	shield: 'FU.Shield',
};

/**
 * @extends RollableClassFeatureDataModel
 * @property {Object} accuracy
 * @property {"dex","ins","mig","wlp"} accuracy.attr1
 * @property {"dex","ins","mig","wlp"} accuracy.attr2
 * @property {number} accuracy.modifier
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

	static getAdditionalData(model) {
		return {
			attributes: FU.attributeAbbreviations,
			damageTypes: FU.damageTypes,
			weaponTypes: weaponModuleTypes,
			weaponCategories: FU.weaponCategoriesWithoutCustom,
			vehicle: model.actor?.system.vehicle.vehicle,
			active: model.actor?.system.vehicle?.weapons.includes(model.item) ?? false,
		};
	}

	/**
	 * @override
	 */
	static async roll(model, item, hrZero) {
		if (model.isShield) {
			return;
		}

		const actor = item.actor;
		if (!actor) {
			return;
		}

		const { accuracyCheck: globalAccuracyBonus = 0, [model.category]: categoryAccuracyBonus = 0 } = actor.system.bonuses.accuracy;

		const checkData = {
			attr1: {
				attribute: model.accuracy.attr1,
				dice: actor.system.attributes[model.accuracy.attr1].current,
			},
			attr2: {
				attribute: model.accuracy.attr2,
				dice: actor.system.attributes[model.accuracy.attr2].current,
			},
			modifier: model.accuracy.modifier,
			bonus: globalAccuracyBonus + categoryAccuracyBonus,
		};

		const checkWeapon = {
			_type: 'weapon',
			name: item.name,
			img: item.img,
			id: item.id,
			category: model.category,
			hands: 'one-handed',
			quality: model.quality,
			type: model.type,
			defense: 'def',
			summary: item.system.summary.value,
			description: await TextEditor.enrichHTML(model.description),
		};

		const { [model.type]: typeDamageBonus = 0, [model.category]: categoryDamageBonus = 0 } = actor.system.bonuses.damage;

		const checkDamage = {
			type: model.damage.type,
			bonus: model.damage.bonus + typeDamageBonus + categoryDamageBonus,
			hrZero,
		};

		return rollCheck({
			check: checkData,
			details: checkWeapon,
			damage: checkDamage,
		}).then((value) => createCheckMessage(value, { [SYSTEM]: { [Flags.ChatMessage.Item]: item } }));
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
