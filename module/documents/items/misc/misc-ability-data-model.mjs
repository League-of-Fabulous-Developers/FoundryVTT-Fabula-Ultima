import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { MiscAbilityMigrations } from './misc-ability-migrations.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { DamageDataModelV2 } from '../common/damage-data-model-v2.mjs';
import { UseWeaponDataModelV2 } from '../common/use-weapon-data-model-v2.mjs';
import { ItemAttributesDataModelV2 } from '../common/item-attributes-data-model-v2.mjs';
import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { ChooseWeaponDialog } from '../skill/choose-weapon-dialog.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { ActionCostDataModel } from '../common/action-cost-data-model.mjs';
import { TargetingDataModel } from '../common/targeting-data-model.mjs';
import { Targeting } from '../../../helpers/targeting.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item, flags) => {
	if (check.type === 'accuracy' && item?.system instanceof MiscAbilityDataModel) {
		const weapon = fromUuidSync(check.additionalData[ABILITY_USED_WEAPON]);
		if (check.critical) {
			CommonSections.opportunity(sections, item.system.opportunity, CHECK_DETAILS);
		}
		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		sections.push(() => ({
			partial: 'systems/projectfu/templates/chat/partials/chat-ability-weapon.hbs',
			data: {
				weapon,
			},
			order: CHECK_DETAILS,
		}));
		const targets = Targeting.getSerializedTargetData();
		CommonSections.spendResource(sections, actor, item, targets, flags);
	}

	if (check.type === 'attribute' && check.additionalData[ABILITY_USED_WEAPON]) {
		const ability = fromUuidSync(check.additionalData[ABILITY_USED_WEAPON]);
		CommonSections.itemFlavor(sections, ability);

		if (check.critical) {
			CommonSections.opportunity(sections, ability.system.opportunity, CHECK_DETAILS);
		}

		CommonSections.description(sections, ability.system.description, ability.system.summary.value, CHECK_DETAILS);
	}
});

const ABILITY_USED_WEAPON = 'AbilityUsedWeapon';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} isMartial.value
 * @property {string} opportunity
 * @property {UseWeaponDataModelV2} useWeapon
 * @property {ItemAttributesDataModelV2} attributes
 * @property {number} accuracy
 * @property {Defense} defense
 * @property {DamageDataModelV2} damage
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {boolean} hasClock.value
 * @property {boolean} hasResource.value
 * @property {ProgressDataModel} progress
 * @property {string} source.value
 * @property {boolean} isOffensive.value
 * @property {boolean} hasRoll.value
 * @property {ActionCostDataModel} cost
 * @property {TargetingDataModel} targeting
 */
export class MiscAbilityDataModel extends foundry.abstract.TypeDataModel {
	static {
		deprecationNotice(this, 'rollInfo.useWeapon.accuracy.value', 'useWeapon.accuracy');
		deprecationNotice(this, 'rollInfo.useWeapon.damage.value', 'useWeapon.damage');
		deprecationNotice(this, 'rollInfo.useWeapon.hrZero.value', 'damage.hrZero');
		deprecationNotice(this, 'rollInfo.attributes.primary.value', 'attributes.primary');
		deprecationNotice(this, 'rollInfo.attributes.secondary.value', 'attributes.secondary');
		deprecationNotice(this, 'rollInfo.accuracy.value', 'accuracy');
		deprecationNotice(this, 'rollInfo.damage.hasDamage.value', 'damage.hasDamage');
		deprecationNotice(this, 'rollInfo.damage.value', 'damage.value');
		deprecationNotice(this, 'rollInfo.damage.type.value', 'damage.type');
		deprecationNotice(this, 'impdamage.hasImpDamage.value');
		deprecationNotice(this, 'impdamage.value');
		deprecationNotice(this, 'impdamage.impType.value');
		deprecationNotice(this, 'impdamage.type.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			opportunity: new StringField(),
			useWeapon: new EmbeddedDataField(UseWeaponDataModelV2, {}),
			attributes: new EmbeddedDataField(ItemAttributesDataModelV2, {
				initial: {
					primary: 'dex',
					secondary: 'ins',
				},
			}),
			accuracy: new NumberField({ initial: 0, integer: true, nullable: false }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses), blank: true }),
			damage: new EmbeddedDataField(DamageDataModelV2, {}),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			hasResource: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
			source: new SchemaField({ value: new StringField() }),
			hasRoll: new SchemaField({ value: new BooleanField() }),
			cost: new EmbeddedDataField(ActionCostDataModel, {}),
			targeting: new EmbeddedDataField(TargetingDataModel, {}),
		};
	}

	static migrateData(source) {
		MiscAbilityMigrations.run(source);
		return source;
	}

	prepareBaseData() {
		if (!this.hasRoll.value) {
			this.useWeapon.accuracy = false;
			this.damage.hasDamage = false;
		}
		if (!this.useWeapon.accuracy) {
			this.damage.hasDamage = false;
		}
		if (!this.damage.hasDamage) {
			this.useWeapon.damage = false;
		}
		if (!this.useWeapon.damage && !this.damage.type) {
			this.damage.type = 'physical';
		}
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.hasRoll.value) {
			if (this.useWeapon.accuracy) {
				return ChecksV2.accuracyCheck(this.parent.actor, this.parent, this.#initializeAccuracyCheck(modifiers));
			} else {
				return ChecksV2.attributeCheck(
					this.parent.actor,
					{
						primary: this.attributes.primary,
						secondary: this.attributes.secondary,
					},
					this.#initializeAttributeCheck(),
				);
			}
		}
		return ChecksV2.display(this.parent.actor, this.parent);
	}

	/**
	 * @param modifiers
	 * @return {CheckCallback}
	 */
	#initializeAccuracyCheck(modifiers) {
		return async (check, actor, item) => {
			const weapon = await ChooseWeaponDialog.prompt(actor, true);
			if (weapon === false) {
				let message = game.i18n.localize('FU.AbilityNoWeaponEquipped');
				ui.notifications.error(message);
				throw new Error(message);
			}
			if (weapon == null) {
				throw new Error('no selection');
			}
			const { check: weaponCheck, error } = await ChecksV2.prepareCheckDryRun('accuracy', actor, weapon);
			if (error) {
				throw error;
			}

			check.primary = weaponCheck.primary;
			check.secondary = weaponCheck.secondary;
			check.additionalData[ABILITY_USED_WEAPON] = weapon.uuid;

			const inspect = CheckConfiguration.inspect(weaponCheck);
			const configure = CheckConfiguration.configure(check);

			if (this.accuracy) {
				check.modifiers.push({
					label: 'FU.CheckBonus',
					value: this.accuracy,
				});
				check.modifiers.push(...weaponCheck.modifiers);
			}

			if (this.damage.hasDamage) {
				configure.setHrZero(this.damage.hrZero || modifiers.shift);
				configure.setTargetedDefense(this.defense || inspect.getTargetedDefense());
				configure.modifyDamage(() => {
					const damage = inspect.getDamage();
					/** @type BonusDamage[] */
					const damageMods = [];
					if (item.system.damage.value) {
						damageMods.push({
							label: 'FU.DamageBonus',
							value: item.system.damage.value,
						});
					}
					if (item.system.useWeapon.damage) {
						damageMods.push(...damage.modifiers.filter(({ label }) => label !== 'FU.AccuracyCheckBonusGeneric'));
					}
					return {
						type: this.damage.type || damage.type,
						modifiers: damageMods,
					};
				});
			}
		};
	}

	/**
	 * @return {CheckCallback}
	 */
	#initializeAttributeCheck() {
		return (check) => {
			check.modifiers.push({
				label: 'FU.CheckBonus',
				value: this.accuracy,
			});
			check.additionalData[ABILITY_USED_WEAPON] = this.parent.uuid;
		};
	}
}
