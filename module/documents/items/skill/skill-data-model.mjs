import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { ChooseWeaponDialog } from './choose-weapon-dialog.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { ActionCostDataModel } from '../common/action-cost-data-model.mjs';
import { TargetingDataModel } from '../common/targeting-data-model.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { UseWeaponDataModelV2 } from '../common/use-weapon-data-model-v2.mjs';
import { ItemAttributesDataModelV2 } from '../common/item-attributes-data-model-v2.mjs';
import { DamageDataModelV2 } from '../common/damage-data-model-v2.mjs';
import { SkillMigrations } from './skill-migrations.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { Traits, TraitUtils } from '../../../pipelines/traits.mjs';
import { EffectApplicationDataModel } from '../common/effect-application-data-model.mjs';
import { ResourceDataModel } from '../common/resource-data-model.mjs';

const weaponUsedBySkill = 'weaponUsedBySkill';
const skillForAttributeCheck = 'skillForAttributeCheck';

/**
 * @type RenderCheckHook
 */
let onRenderAccuracyCheck = (sections, check, actor, item, flags) => {
	if (check.type === 'accuracy' && item?.system instanceof SkillDataModel) {
		const weapon = fromUuidSync(check.additionalData[weaponUsedBySkill]);

		if (check.critical) {
			CommonSections.opportunity(sections, item.system.opportunity, CHECK_DETAILS);
		}

		CommonSections.tags(sections, getTags(item), CHECK_DETAILS);
		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		if (weapon) {
			sections.push(() => ({
				partial: 'systems/projectfu/templates/chat/partials/chat-ability-weapon.hbs',
				data: {
					weapon,
				},
				order: CHECK_DETAILS,
			}));

			if (weapon.system.getTags instanceof Function) {
				CommonSections.tags(sections, weapon.system.getTags(item.system.useWeapon.traits), CHECK_DETAILS);
			}
		}

		const inspector = CheckConfiguration.inspect(check);
		const targets = inspector.getTargets();
		CommonSections.spendResource(sections, actor, item, item.system.cost, targets, flags);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderAccuracyCheck);

/**
 * @type RenderCheckHook
 */
let onRenderAttributeCheck = (sections, check, actor, item, flags) => {
	if (check.type === 'attribute' && check.additionalData[skillForAttributeCheck]) {
		const skill = fromUuidSync(check.additionalData[skillForAttributeCheck]);
		const inspector = CheckConfiguration.inspect(check);
		CommonSections.itemFlavor(sections, skill);
		CommonSections.tags(sections, getTags(skill), CHECK_DETAILS);
		if (skill.system.hasResource.value) {
			CommonSections.resource(sections, skill.system.rp, CHECK_DETAILS);
		}
		CommonSections.description(sections, skill.system.description, skill.system.summary.value, CHECK_DETAILS);
		CommonSections.actions(sections, actor, item, [], flags, inspector);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderAttributeCheck);

/**
 * @type RenderCheckHook
 */
const onRenderDisplay = (sections, check, actor, item, flags) => {
	if (check.type === 'display' && item?.system instanceof SkillDataModel) {
		CommonSections.tags(sections, getTags(item), CHECK_DETAILS);
		if (item.system.hasResource.value) {
			CommonSections.resource(sections, item.system.rp, CHECK_DETAILS);
		}
		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		const inspector = CheckConfiguration.inspect(check);
		const targets = inspector.getTargetsOrDefault();
		CommonSections.spendResource(sections, actor, item, item.system.cost, targets, flags);
		// TODO: Find a better way to handle this, as it's needed when using a spell without accuracy
		if (!item.system.hasRoll.value) {
			CommonSections.actions(sections, actor, item, targets, flags, inspector);
		}
		CommonEvents.skill(actor, item);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderDisplay);

/**
 * @param {FUItem} skill
 * @return Tag[]
 */
function getTags(skill) {
	return [{ tag: 'FU.Class', separator: ':', value: skill.system.class.value, show: skill.system.class.value }, { tag: 'FU.SkillLevelAbbr', separator: ' ', value: skill.system.level.value }, ...TraitUtils.toTags(skill.system.traits)];
}

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {number} level.value
 * @property {number} level.min
 * @property {number} level.max
 * @property {string} class.value
 * @property {UseWeaponDataModelV2} useWeapon
 * @property {ItemAttributesDataModelV2} attributes
 * @property {String} accuracy A number or expression for the accuracy to be used.
 * @property {Defense} defense
 * @property {DamageDataModelV2} damage
 * @property {ResourceDataModel} resource
 * @property {EffectApplicationDataModel} effects *
 * @property {ImprovisedDamageDataModel} impdamage
 * @property {string} source.value
 * @property {boolean} hasRoll.value
 * @property {ActionCostDataModel} cost
 * @property {TargetingDataModel} targeting
 * @property {Set<String>} traits
 */
export class SkillDataModel extends FUStandardItemDataModel {
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
		const { SchemaField, StringField, BooleanField, NumberField, EmbeddedDataField, SetField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			level: new SchemaField({
				value: new NumberField({ initial: 1, min: 0, integer: true, nullable: false }),
				max: new NumberField({ initial: 10, min: 1, integer: true, nullable: false }),
				min: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			}),
			class: new SchemaField({ value: new StringField() }),
			useWeapon: new EmbeddedDataField(UseWeaponDataModelV2, {}),
			attributes: new EmbeddedDataField(ItemAttributesDataModelV2, {
				initial: {
					primary: 'dex',
					secondary: 'ins',
				},
			}),
			accuracy: new StringField({ initial: '', blank: true, nullable: false }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses), blank: true }),
			damage: new EmbeddedDataField(DamageDataModelV2, {}),
			resource: new EmbeddedDataField(ResourceDataModel, {}),
			effects: new EmbeddedDataField(EffectApplicationDataModel, {}),
			hasResource: new SchemaField({ value: new BooleanField() }),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
			hasRoll: new SchemaField({ value: new BooleanField() }),
			cost: new EmbeddedDataField(ActionCostDataModel, {}),
			targeting: new EmbeddedDataField(TargetingDataModel, {}),
			traits: new SetField(new StringField()),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source);
		SkillMigrations.run(source);
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
			this.damage.type = '';
		}
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
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 * @remarks Expects a weapon
	 */
	#initializeSkillDisplay(modifiers) {
		return async (check, actor, item) => {
			/** @type SkillDataModel **/
			const skill = item.system;
			const config = CheckConfiguration.configure(check);
			config.addEffects(skill.effects.entries);
			if (skill.resource.enabled) {
				config.setResource(skill.resource.type, skill.resource.amount);
			}
		};
	}

	/**
	 * @return {CheckCallback}
	 */
	#initializeAttributeCheck(modifiers) {
		return async (check, actor, item) => {
			/** @type SkillDataModel **/
			const skill = item.system;
			const config = CheckConfiguration.configure(check);
			const targets = config.getTargets();
			const context = ExpressionContext.fromTargetData(actor, item, targets);

			if (skill.defense && targets.length === 1) {
				let dl;
				switch (skill.defense) {
					case 'def':
						dl = targets[0].def;
						break;

					case 'mdef':
						dl = targets[0].mdef;
						break;
				}
				config.setDifficulty(dl);
			}

			if (this.accuracy) {
				const calculatedAccuracyBonus = await Expressions.evaluateAsync(this.accuracy, context);
				if (calculatedAccuracyBonus > 0) {
					check.modifiers.push({
						label: 'FU.CheckBonus',
						value: calculatedAccuracyBonus,
					});
				}
			}
			check.additionalData[skillForAttributeCheck] = this.parent.uuid;
		};
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 * @remarks Expects a weapon
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
			const { check: weaponCheck, error } = await Checks.prepareCheckDryRun('accuracy', actor, weapon);
			if (error) {
				throw error;
			}

			check.primary = weaponCheck.primary;
			check.secondary = weaponCheck.secondary;
			check.additionalData[weaponUsedBySkill] = weapon.uuid;

			/** @type SkillDataModel **/
			const skill = item.system;
			const config = CheckConfiguration.configure(check);
			const targets = config.getTargets();
			const context = ExpressionContext.fromTargetData(actor, item, targets);

			config.addTraits('skill');
			config.addTraitsFromItemModel(this.traits);
			if (skill.useWeapon.traits) {
				config.addTraitsFromItemModel(weapon.system.traits);
			}
			config.setWeaponTraits(config.getWeaponTraits());

			if (this.accuracy) {
				const calculatedAccuracyBonus = await Expressions.evaluateAsync(this.accuracy, context);
				if (calculatedAccuracyBonus > 0) {
					check.modifiers.push({
						label: 'FU.CheckBonus',
						value: calculatedAccuracyBonus,
					});
				}
			}

			if (skill.resource.enabled) {
				config.setResource(skill.resource.type, skill.resource.amount);
			}

			if (this.damage.hasDamage) {
				config.addTraits(Traits.Damage);
				config.setHrZero(this.damage.hrZero || modifiers.shift);
				config.setTargetedDefense(this.defense || config.getTargetedDefense());
				config.modifyDamage(() => {
					const damage = config.getDamage();
					/** @type DamageModifier[] */
					const damageMods = [];
					if (item.system.damage.value) {
						damageMods.push({
							label: 'FU.DamageBonus',
							value: item.system.damage.value,
						});
					}
					if (item.system.useWeapon.damage) {
						damageMods.push(...damage.modifiers);
					}
					return {
						type: this.damage.type || damage.type,
						modifiers: damageMods,
					};
				});

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

			config.addEffects(skill.effects.entries);
		};
	}

	shouldApplyEffect(effect) {
		return this.level.value > 0;
	}

	get attributePartials() {
		return [
			ItemPartialTemplates.standard,
			ItemPartialTemplates.traitsLegacy,
			ItemPartialTemplates.classField,
			ItemPartialTemplates.actionCost,
			ItemPartialTemplates.skillAttributes,
			ItemPartialTemplates.accuracy,
			ItemPartialTemplates.damage,
			ItemPartialTemplates.effects,
			ItemPartialTemplates.targeting,
			ItemPartialTemplates.resource,
			ItemPartialTemplates.resourcePoints,
		];
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	setSkillLevel(event, target) {
		let newLevel = Number(target.closest('[data-level]').dataset.level) || 0;
		if (event.type === 'contextmenu' || newLevel === this.level.value) {
			newLevel = Math.max(newLevel - 1, 0);
		}

		this.parent.update({
			'system.level.value': newLevel,
		});
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	updateSkillResource(event, target) {
		return this.parent.update({
			'system.rp': this.rp.getProgressUpdate(event, target, {
				indirect: {
					dataAttribute: 'data-resource-action',
					attributeValueIncrement: 'increment',
					attributeValueDecrement: 'decrement',
				},
			}),
		});
	}
}
