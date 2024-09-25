import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { WeaponMigrations } from './weapon-migrations.mjs';
import { ItemAttributesDataModel } from '../common/item-attributes-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { AccuracyCheck } from '../../../checks/accuracy-check.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { SETTINGS } from '../../../settings.js';
import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';

/**
 * @param {Check} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const prepareCheck = (check, actor, item, registerCallback) => {
	if (check.type === 'accuracy' && item.system instanceof WeaponDataModel) {
		check.primary = item.system.attributes.primary.value;
		check.secondary = item.system.attributes.secondary.value;
		const baseAccuracy = item.system.accuracy.value;
		if (baseAccuracy) {
			check.modifiers.push({
				label: 'FU.AccuracyCheckBaseAccuracy',
				value: baseAccuracy,
			});
		}
		const category = item.system.category?.value;
		if (category && actor.system.bonuses.accuracy[category]) {
			check.modifiers.push({
				label: `FU.AccuracyCheckBonus${category.capitalize()}`,
				value: actor.system.bonuses.accuracy[category],
			});
		}

		const attackType = item.system.type?.value;
		if (attackType === 'melee' && actor.system.bonuses.accuracy.accuracyMelee) {
			check.modifiers.push({
				label: 'FU.AccuracyCheckBonusMelee',
				value: actor.system.bonuses.accuracy.accuracyMelee,
			});
		} else if (attackType === 'ranged' && actor.system.bonuses.accuracy.accuracyRanged) {
			check.modifiers.push({
				label: 'FU.AccuracyCheckBonusRanged',
				value: actor.system.bonuses.accuracy.accuracyRanged,
			});
		}

		const configurer = AccuracyCheck.configure(check)
			.setDamage(item.system.damageType.value, item.system.damage.value)
			.setTargetedDefense(item.system.defense)
			.modifyHrZero((hrZero) => hrZero || item.system.rollInfo.useWeapon.hrZero.value);

		const attackTypeBonus = actor.system.bonuses.damage[item.system.type.value] ?? 0;
		if (attackTypeBonus) {
			configurer.addDamageBonus(`FU.DamageBonusType${item.system.type.value.capitalize()}`, attackTypeBonus);
		}
		const weaponCategoryBonus = actor.system.bonuses.damage[item.system.category.value] ?? 0;
		if (weaponCategoryBonus) {
			configurer.addDamageBonus(`FU.DamageBonusCategory${item.system.category.value.capitalize()}`, weaponCategoryBonus);
		}
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
	if (item && item.system instanceof WeaponDataModel) {
		data.push(async () => ({
			order: CHECK_DETAILS,
			partial: 'systems/projectfu/templates/chat/partials/chat-weapon-details.hbs',
			data: {
				weapon: {
					category: item.system.category.value,
					hands: item.system.hands.value,
					type: item.system.type.value,
					quality: item.system.quality.value,
					summary: item.system.summary.value,
					description: await TextEditor.enrichHTML(item.system.description),
				},
				collapseDescriptions: game.settings.get(SYSTEM, SETTINGS.collapseDescriptions),
			},
		}));
	}
}

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {number} cost.value
 * @property {boolean} isMartial.value
 * @property {string} quality.value
 * @property {ItemAttributesDataModel} attributes
 * @property {number} accuracy.value
 * @property {Defense} defense
 * @property {number} damage.value
 * @property {WeaponType} type.value
 * @property {WeaponCategory} category.value
 * @property {Handedness} hands.value
 * @property {'minor', 'heavy', 'massive'} impType.value
 * @property {DamageType} damageType.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {boolean} isCustomWeapon.value
 * @property {string} source.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 */
export class WeaponDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			isMartial: new SchemaField({ value: new BooleanField() }),
			quality: new SchemaField({ value: new StringField() }),
			def: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			mdef: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			init: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses) }),
			damage: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			type: new SchemaField({ value: new StringField({ initial: 'melee', choices: Object.keys(FU.weaponTypes) }) }),
			category: new SchemaField({ value: new StringField({ initial: 'brawling', choices: Object.keys(FU.weaponCategories) }) }),
			hands: new SchemaField({ value: new StringField({ initial: 'one-handed', choices: Object.keys(FU.handedness) }) }),
			impType: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'heavy', 'massive'] }) }),
			damageType: new SchemaField({ value: new StringField({ initial: 'physical', choices: Object.keys(FU.damageTypes) }) }),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			isCustomWeapon: new SchemaField({ value: new BooleanField() }),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
		};
	}

	static migrateData(source) {
		WeaponMigrations.run(source);
		return source;
	}

	prepareBaseData() {
		if (this.isCustomWeapon.value) {
			this.hands.value = 'two-handed';
			this.cost.value = Math.max(300, this.cost.value);
		}
	}

	transferEffects() {
		return this.parent.isEquipped && !this.parent.actor?.system.vehicle?.weaponsActive;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		return ChecksV2.accuracyCheck(this.parent.actor, this.parent, CheckConfiguration.initHrZero(modifiers.shift));
	}
}
