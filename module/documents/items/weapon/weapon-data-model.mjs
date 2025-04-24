import { FU } from '../../../helpers/config.mjs';
import { WeaponMigrations } from './weapon-migrations.mjs';
import { ItemAttributesDataModel } from '../common/item-attributes-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';

/**
 * @param {CheckV2} check
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

		CheckConfiguration.configure(check)
			.setDamage(item.system.damageType.value, item.system.damage.value)
			.setWeaponTraits({
				weaponType: item.system.type.value,
				weaponCategory: item.system.category.value,
				handedness: item.system.hands.value,
			})
			.addTraits(item.system.damageType.value)
			.setTargetedDefense(item.system.defense)
			.setDamageOverride(actor, 'attack')
			.modifyHrZero((hrZero) => hrZero || item.system.rollInfo.useWeapon.hrZero.value);
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
				},
			},
		}));
		CommonSections.description(data, item.system.description, item.system.summary.value, CHECK_DETAILS);
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

	/**
	 * Get the display data for a weapon item.
	 *
	 * @returns {object|boolean} An object containing weapon display information, or false if this is not a weapon.
	 * @property {string} attackString - The weapon's attack description.
	 * @property {string} damageString - The weapon's damage description.
	 * @property {string} qualityString - The weapon's quality description.
	 */
	getWeaponDisplayData() {
		function translate(string) {
			const allTranslations = Object.assign({}, CONFIG.FU.handedness, CONFIG.FU.weaponCategories, CONFIG.FU.weaponTypes, CONFIG.FU.attributeAbbreviations, CONFIG.FU.damageTypes);
			if (string?.includes('.') && CONFIG.FU.defenses[string.split('.')[0]]) {
				const [category, subkey] = string.split('.');
				return game.i18n.localize(CONFIG.FU.defenses[category]?.[subkey] ?? string);
			}

			return game.i18n.localize(allTranslations?.[string] ?? string);
		}

		const hrZeroText = this.rollInfo?.useWeapon?.hrZero?.value ? `${game.i18n.localize('FU.HRZero')} +` : `${game.i18n.localize('FU.HighRollAbbr')} +`;
		const qualText = this.quality?.value || '';
		let qualityString = '';
		let detailString = '';

		const primaryAttribute = this.attributes?.primary?.value;
		const secondaryAttribute = this.attributes?.secondary?.value;

		const attackAttributes = [translate(primaryAttribute || '').toUpperCase(), translate(secondaryAttribute || '').toUpperCase()].join(' + ');

		const accuracyValue = this.accuracy?.value ?? 0;
		const accuracyGlobalValue = this.parent.actor.system.bonuses.accuracy?.accuracyCheck ?? 0;
		const accuracyTotal = accuracyValue + accuracyGlobalValue;
		const damageValue = this.damage?.value ?? 0;
		const weaponType = this.type?.value;
		const defenseString = this.system?.defense ? translate(`${this.defense}.abbr`) : '';

		let damageGlobalValue = 0;
		if (weaponType === 'melee') {
			damageGlobalValue = this.parent.actor.system.bonuses.damage?.melee ?? 0;
		} else if (weaponType === 'ranged') {
			damageGlobalValue = this.parent.actor.system.bonuses.damage?.ranged ?? 0;
		}
		const damageTotal = damageValue + damageGlobalValue;

		const attackString = `【${attackAttributes}】${accuracyTotal > 0 ? ` +${accuracyTotal}` : ''}`;

		const damageTypeValue = translate(this.damageType?.value || '');

		const damageString = `【${hrZeroText} ${damageTotal}】 ${damageTypeValue}`;

		detailString = [attackString, damageString].filter(Boolean).join('⬥');
		qualityString = [translate(this.category?.value), translate(this.hands?.value), translate(this.type?.value), defenseString, qualText].filter(Boolean).join(' ⬥ ');

		return {
			attackString,
			damageString,
			detailString: `${detailString}`,
			qualityString: `${qualityString}`,
		};
	}
}
