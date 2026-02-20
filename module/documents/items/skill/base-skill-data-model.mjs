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
import { Traits } from '../../../pipelines/traits.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { ChooseWeaponDialog } from './choose-weapon-dialog.mjs';
import { WeaponDataModel } from '../weapon/weapon-data-model.mjs';
import { ResourcePipeline } from '../../../pipelines/resource-pipeline.mjs';
import { BasicItemDataModel } from '../basic/basic-item-data-model.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';

const skillForAttributeCheck = 'skillForAttributeCheck';

/**
 * @type RenderCheckHook
 */
let onRenderAccuracyCheck = async (data, check, actor, item, flags) => {
	if (check.type === 'accuracy' && item?.system instanceof BaseSkillDataModel) {
		const inspector = CheckConfiguration.inspect(check);
		const weapon = await fromUuid(inspector.getWeaponReference());

		if (check.critical) {
			CommonSections.opportunity(data.sections, item.system.opportunity, CHECK_DETAILS);
		}

		let tags = item.system.getTags();
		if (weapon) {
			if (weapon.system.getTags instanceof Function) {
				tags.push(...weapon.system.getTags(item.system.useWeapon.traits));
			}
		}
		data.tags.push(...tags);
		CommonSections.description(data.sections, item.system.description, item.system.summary.value, CHECK_DETAILS);

		if (item.system.hasClock?.value) {
			CommonSections.clock(data.sections, item.system.progress, CHECK_DETAILS);
		}
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderAccuracyCheck);

/**
 * @type RenderCheckHook
 */
let onRenderAttributeCheck = async (data, check, actor, item, flags) => {
	if (check.type === 'attribute' && item?.system instanceof BaseSkillDataModel && check.additionalData[skillForAttributeCheck]) {
		const skill = await fromUuid(check.additionalData[skillForAttributeCheck]);
		const inspector = CheckConfiguration.inspect(check);
		CommonSections.itemFlavor(data.sections, skill);
		data.tags.push(...skill.system.getTags());
		CommonSections.description(data.sections, skill.system.description, skill.system.summary.value, CHECK_DETAILS);
		CommonSections.actions(data, actor, item, [], flags, inspector);

		if (check.critical) {
			CommonSections.opportunity(data.sections, skill.system.opportunity, CHECK_DETAILS);
		}

		if (skill.system.hasResource?.value) {
			CommonSections.resource(data.sections, skill.system.rp, CHECK_DETAILS);
		}
		if (skill.system.hasClock?.value) {
			CommonSections.clock(data.sections, item.system.progress, CHECK_DETAILS);
		}
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderAttributeCheck);

/**
 * @type RenderCheckHook
 */
const onRenderDisplay = (data, check, actor, item, flags) => {
	if (check.type === 'display' && item?.system instanceof BaseSkillDataModel) {
		data.tags.push(...item.system.getTags());
		CommonSections.description(data.sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		const inspector = CheckConfiguration.inspect(check);
		const targets = inspector.getTargetsOrDefault();
		// TODO: Find a better way to handle this, as it's needed when using a spell without accuracy
		if (!item.system.hasRoll.value) {
			CommonSections.actions(data, actor, item, targets, flags, inspector);
		}
		if (item.system.hasResource?.value) {
			CommonSections.resource(data.sections, item.system.rp, CHECK_DETAILS);
		}
		CommonEvents.skill(actor, item);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderDisplay);

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
		const { SchemaField, StringField, BooleanField, EmbeddedDataField, SetField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			attributes: new EmbeddedDataField(ItemAttributesDataModelV2, {
				initial: {
					primary: 'dex',
					secondary: 'ins',
				},
			}),
			useWeapon: new EmbeddedDataField(UseWeaponDataModelV2, {}),
			accuracy: new StringField({ nullable: false }),
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

	prepareBaseData() {
		if (!this.hasRoll.value) {
			this.useWeapon.accuracy = false;
		}
		if (!this.damage.hasDamage) {
			this.useWeapon.damage = false;
		}
		// If not using weapon damage, and it's not set, reset to default
		if (!this.useWeapon.damage && !this.damage.type) {
			this.damage.type = 'physical';
		}
	}

	/**
	 * @return Tag[]
	 */
	getTags() {
		return [];
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.hasRoll.value) {
			if (this.useWeapon.accuracy) {
				return Checks.accuracyCheck(this.parent.actor, this.parent, this.#initializeAccuracyCheck(modifiers));
			} else {
				return Checks.attributeCheck(
					this.parent.actor,
					{
						primary: this.attributes.primary,
						secondary: this.attributes.secondary,
					},
					this.parent,
					this.#initializeAttributeCheck(modifiers),
				);
			}
		}
		return Checks.display(this.parent.actor, this.parent, this.#initializeSkillDisplay(modifiers));
	}

	/**
	 * @param modifiers
	 * @return {CheckCallback}
	 * @override
	 */
	#initializeAccuracyCheck(modifiers) {
		return async (check, actor, item) => {
			const weapon = await this.getWeapon(actor);
			const { check: weaponCheck, error } = await Checks.prepareCheckDryRun('accuracy', actor, weapon);
			if (error) {
				throw error;
			}

			check.primary = weaponCheck.primary;
			check.secondary = weaponCheck.secondary;

			const config = CheckConfiguration.configure(check);
			const targets = config.getTargets();
			const context = ExpressionContext.fromTargetData(actor, item, targets);

			config.setWeaponReference(weapon);
			config.setHrZero(this.damage.hrZero || modifiers.shift);
			await this.configureCheck(config, actor, item);
			await this.addSkillDamage(config, item, context, weapon.system);
			await this.addSkillAccuracy(config, actor, item, context);
		};
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 */
	#initializeAttributeCheck(modifiers) {
		return async (check, actor, item) => {
			const config = CheckConfiguration.configure(check);
			const targets = config.getTargets();
			const context = ExpressionContext.fromTargetData(actor, item, targets);

			config.setWeaponReference(this.parent);
			config.check.additionalData[skillForAttributeCheck] = this.parent.uuid;
			config.setHrZero(this.damage.hrZero || modifiers.shift);
			await this.configureCheck(config, actor, item);
			await this.addSkillAccuracy(config, actor, item, context);
			await this.addSkillDamage(config, item, context);
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
		};
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 * @remarks Expects a weapon
	 */
	#initializeSkillDisplay(modifiers) {
		return async (check, actor, item) => {
			const config = CheckConfiguration.configure(check);
			const targets = config.getTargets();
			const context = ExpressionContext.fromTargetData(actor, item, targets);
			await this.configureCheck(config, actor, item);
			if (this.damage.hasDamage) {
				if (this.useWeapon.damage) {
					const weapon = await this.getWeapon(actor);
					config.setWeaponReference(weapon);
					/** @type WeaponDataModel **/
					const weaponData = weapon.system;
					config.setDamage(this.damage.type || weaponData.damageType.value, weaponData.damage.value);
				}
				await this.addSkillDamage(config, item, context);
			}
		};
	}

	/**
	 * @desc Common configuration for attribute checks.
	 * @param {CheckConfigurer} config
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 */
	async configureCheck(config, actor, item) {
		config.addTraits('skill');
		config.addTraitsFromItemModel(this.traits);
		config.setEffects(this.effects);
		config.addTraitsFromItemModel(this.traits);
		if (this.resource.enabled) {
			config.setResource(this.resource.type, this.resource.amount);
		}
		await ResourcePipeline.configureExpense(config, actor, item, this.cost);
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
		if (this.defense) {
			config.setTargetedDefense(this.defense);
		}
	}

	/**
	 * @param {CheckConfigurer} config
	 * @param {FUItem} item
	 * @param {ExpressionContext} context
	 * @param {WeaponDataModel|CustomWeaponDataModel} weaponData
	 * @returns {Promise<void>}
	 */
	async addSkillDamage(config, item, context, weaponData = undefined) {
		if (this.damage.hasDamage) {
			config.addTraits(Traits.Damage);

			if (config.hasDamage) {
				config.modifyDamage((damage) => {
					damage.type = this.damage.type || damage.type;
					damage.addModifier('FU.DamageBonus', item.system.damage.value);
					return damage;
				});
			} else {
				config.setDamage(this.damage.type, item.system.damage.value);
			}

			// Weapon support
			if (weaponData) {
				if (this.useWeapon.traits) {
					if (weaponData.traits) {
						config.addTraitsFromItemModel(weaponData.traits);
					}
					if (weaponData instanceof WeaponDataModel) {
						config.setWeaponTraits({
							weaponType: weaponData.type.value,
							weaponCategory: weaponData.category.value,
							handedness: weaponData.hands.value,
						});
					} else if (weaponData instanceof BasicItemDataModel) {
						config.setWeaponTraits({
							weaponType: weaponData.type.value,
						});
					}
				}
				if (this.useWeapon.damage) {
					config.setDamage(this.damage.type || weaponData.damageType.value, weaponData.damage.value);
				}
				if (this.useWeapon.accuracy) {
					config.addModifier('FU.CheckBonus', weaponData.accuracy.value);
					if (weaponData.defense) {
						config.setTargetedDefense(weaponData.defense);
					}
				}
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
