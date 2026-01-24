import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { UseWeaponDataModelV2 } from '../common/use-weapon-data-model-v2.mjs';
import { FU } from '../../../helpers/config.mjs';
import { DamageDataModelV2 } from '../common/damage-data-model-v2.mjs';
import { ItemAttributesDataModelV2 } from '../common/item-attributes-data-model-v2.mjs';
import { TargetingDataModel } from '../common/targeting-data-model.mjs';
import { ActionCostDataModel } from '../common/action-cost-data-model.mjs';
import { EffectApplicationDataModel } from '../common/effect-application-data-model.mjs';
import { ResourceDataModel } from '../common/resource-data-model.mjs';
import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { Traits, TraitUtils } from '../../../pipelines/traits.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { ChooseWeaponDialog } from './choose-weapon-dialog.mjs';

/**
 * @property {string} description
 * @property {string} opportunity
 * @property {UseWeaponDataModelV2} useWeapon
 * @property {ItemAttributesDataModelV2} attributes
 * @property {number} accuracy
 * @property {Defense} defense
 * @property {DamageDataModelV2} damage
 * @property {EffectApplicationDataModel} effects
 * @property {ActionCostDataModel} cost
 * @property {TargetingDataModel} targeting
 * @property {Set<String>} traits
 */

export class BaseSkillDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField, EmbeddedDataField, SetField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			attributes: new EmbeddedDataField(ItemAttributesDataModelV2, {
				initial: {
					primary: 'dex',
					secondary: 'ins',
				},
			}),
			useWeapon: new EmbeddedDataField(UseWeaponDataModelV2, {}),
			accuracy: new NumberField({ initial: 0, integer: true, nullable: false }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses), blank: true }),
			damage: new EmbeddedDataField(DamageDataModelV2, {}),
			targeting: new EmbeddedDataField(TargetingDataModel, {}),
			traits: new SetField(new StringField()),
			effects: new EmbeddedDataField(EffectApplicationDataModel, {}),
			cost: new EmbeddedDataField(ActionCostDataModel, {}),
			resource: new EmbeddedDataField(ResourceDataModel, {}),
			// TODO: Deprecate due to progress tracks in effects
			hasRoll: new SchemaField({ value: new BooleanField() }),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
			hasResource: new SchemaField({ value: new BooleanField() }),
		});
	}

	/**
	 * @desc Common configuration for attribute checks.
	 * @param {CheckConfigurer} config
	 */
	configureCheck(config) {
		config.addTraits('skill');
		config.addTraitsFromItemModel(this.traits);
		config.addEffects(this.effects.entries);
		config.addTraitsFromItemModel(this.traits);
		if (this.resource.enabled) {
			config.setResource(this.resource.type, this.resource.amount);
		}
	}

	/**
	 * @return Tag[]
	 */
	getCommonTags() {
		return TraitUtils.toTags(this.traits);
	}

	/**
	 * @desc Common configuration for display checks.
	 * @param {CheckConfigurer} config
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 */
	async configureAttributeCheck(config, actor, item) {
		const targets = config.getTargets();
		const context = ExpressionContext.fromTargetData(actor, item, targets);
		await this.addSkillAccuracy(config, actor, item, context);
		if (this.defense && targets.length === 1) {
			let dl;
			switch (this.defense) {
				case 'def':
					dl = targets[0].def;
					break;

				case 'mdef':
					dl = targets[0].mdef;
					break;
			}
			config.setDifficulty(dl);
		}
	}

	/**
	 * @desc Common configuration for display checks.
	 * @param {CheckConfigurer} config
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 */
	async configureDisplayCheck(config, actor, item) {
		const targets = config.getTargets();
		const context = ExpressionContext.fromTargetData(actor, item, targets);
		this.configureCheck(config);
		if (this.damage.hasDamage) {
			if (this.useWeapon.damage) {
				const weapon = await this.getWeapon(actor);
				config.setWeapon(weapon);
				/** @type WeaponDataModel **/
				const weaponData = weapon.system;
				config.setDamage(this.damage.type || weaponData.damageType.value, weaponData.damage.value);
			}
			await this.addSkillDamage(config, item, context);
		}
	}

	/**
	 * @desc Common configuration for display checks.
	 * @param {CheckConfigurer} config
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @param {ExpressionContext} context
	 */
	async addSkillAccuracy(config, actor, item, context) {
		if (this.accuracy) {
			const calculatedAccuracyBonus = await Expressions.evaluateAsync(this.accuracy, context);
			if (calculatedAccuracyBonus > 0) {
				config.check.modifiers.push({
					label: 'FU.CheckBonus',
					value: calculatedAccuracyBonus,
				});
			}
		}
	}

	/**
	 * @param {CheckConfigurer} config
	 * @param {FUItem} item
	 * @param {ExpressionContext} context
	 * @returns {Promise<void>}
	 */
	async addSkillDamage(config, item, context) {
		if (this.damage.hasDamage) {
			config.addTraits(Traits.Damage);
			config.setTargetedDefense(this.defense || config.getTargetedDefense());
			if (config.hasDamage) {
				config.modifyDamage((damage) => {
					damage.type = this.damage.type || damage.type;
					damage.addModifier('FU.DamageBonus', item.system.damage.value);
					return damage;
				});
			} else {
				config.setDamage(this.damage.type, item.system.damage.value);
			}

			const onRoll = this.damage.onRoll;
			if (onRoll) {
				const extraDamage = await Expressions.evaluateAsync(onRoll, context);
				if (extraDamage > 0) {
					config.addDamageBonus('FU.DamageOnRoll', extraDamage);
				}
			}

			const onApply = this.damage.onApply;
			if (onApply) {
				config.setExtraDamage(onApply);
			}
		}
	}

	/**
	 * @param {FUActor} actor
	 * @returns {Promise<game.projectfu.FUItem>}
	 */
	async getWeapon(actor) {
		const weapon = await ChooseWeaponDialog.prompt(actor, true);
		if (weapon === false) {
			let message = game.i18n.localize('FU.AbilityNoWeaponEquipped');
			ui.notifications.error(message);
			throw new Error(message);
		}
		if (weapon == null) {
			throw new Error('no selection');
		}
		return weapon;
	}

	/**
	 * @returns {String[]} Common partials used by all skills.
	 */
	get commonPartials() {
		return [
			ItemPartialTemplates.standard,
			ItemPartialTemplates.traitsLegacy,
			ItemPartialTemplates.actionCost,
			ItemPartialTemplates.accuracy,
			ItemPartialTemplates.damage,
			ItemPartialTemplates.effects,
			ItemPartialTemplates.resource,
			ItemPartialTemplates.resourcePoints,
			ItemPartialTemplates.targeting,
		];
	}
}
