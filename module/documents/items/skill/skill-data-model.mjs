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
import { TraitUtils } from '../../../pipelines/traits.mjs';

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
let onRenderAttributeCheck = (sections, check, actor, item) => {
	if (check.type === 'attribute' && check.additionalData[skillForAttributeCheck]) {
		const skill = fromUuidSync(check.additionalData[skillForAttributeCheck]);
		CommonSections.itemFlavor(sections, skill);
		CommonSections.tags(sections, getTags(skill), CHECK_DETAILS);
		if (skill.system.hasResource.value) {
			CommonSections.resource(sections, skill.system.rp, CHECK_DETAILS);
		}
		CommonSections.description(sections, skill.system.description, skill.system.summary.value, CHECK_DETAILS);
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
			CommonSections.targeted(sections, actor, item, targets, flags, inspector);
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
 * @property {number} accuracy
 * @property {Defense} defense
 * @property {DamageDataModelV2} damage
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
			accuracy: new NumberField({ initial: 0, integer: true, nullable: false }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses), blank: true }),
			damage: new EmbeddedDataField(DamageDataModelV2, {}),
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
				return Checks.accuracyCheck(this.parent.actor, this.parent, this.#initializeAccuracyCheck(modifiers));
			} else {
				return Checks.attributeCheck(
					this.parent.actor,
					{
						primary: this.attributes.primary,
						secondary: this.attributes.secondary,
					},
					this.parent,
					this.#initializeAttributeCheck(),
				);
			}
		}
		return Checks.display(this.parent.actor, this.parent);
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

			const inspect = CheckConfiguration.inspect(weaponCheck);
			const configure = CheckConfiguration.configure(check);

			configure.addTraits('skill');
			configure.addTraitsFromItemModel(this.traits);
			if (item.system.useWeapon.traits) {
				configure.addTraitsFromItemModel(weapon.system.traits);
			}
			configure.setWeaponTraits(inspect.getWeaponTraits());

			if (this.accuracy) {
				check.modifiers.push({
					label: 'FU.CheckBonus',
					value: this.accuracy,
				});
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
						damageMods.push(...damage.modifiers);
					}
					return {
						type: this.damage.type || damage.type,
						modifiers: damageMods,
					};
				});

				const onRoll = this.damage.onRoll;
				if (onRoll) {
					const targets = inspect.getTargets();
					const context = ExpressionContext.fromTargetData(actor, item, targets);
					const extraDamage = await Expressions.evaluateAsync(onRoll, context);
					if (extraDamage > 0) {
						configure.addDamageBonus('FU.DamageOnRoll', extraDamage);
					}
				}

				const onApply = this.damage.onApply;
				if (onApply) {
					configure.setExtraDamage(onApply);
				}
			}

			await CommonEvents.initializeCheck(configure, actor, item);
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
			check.additionalData[skillForAttributeCheck] = this.parent.uuid;
		};
	}

	shouldApplyEffect(effect) {
		return this.level.value > 0;
	}

	get attributePartials() {
		return [
			ItemPartialTemplates.standard,
			ItemPartialTemplates.traits,
			ItemPartialTemplates.classField,
			ItemPartialTemplates.actionCost,
			ItemPartialTemplates.skillAttributes,
			ItemPartialTemplates.accuracy,
			ItemPartialTemplates.damage,
			ItemPartialTemplates.targeting,
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
