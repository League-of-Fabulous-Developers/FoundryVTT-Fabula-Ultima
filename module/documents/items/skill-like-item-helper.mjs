import { ActionTraits, Traits } from '../../pipelines/traits.mjs';
import { ExpressionContext, Expressions } from '../../expressions/expressions.mjs';
import { WeaponResolver } from './skill/weapon-resolver.mjs';
import { CheckConfiguration } from '../../checks/check-configuration.mjs';
import { ResourcePipeline } from '../../pipelines/resource-pipeline.mjs';
import { Checks } from '../../checks/checks.mjs';
import { CheckHooks } from '../../checks/check-hooks.mjs';
import { CommonSections } from '../../checks/common-sections.mjs';
import { ChatSectionOrder, CHECK_DETAILS } from '../../checks/default-section-order.mjs';
import { CommonEvents } from '../../checks/common-events.mjs';

const skillForAttributeCheck = 'skillForAttributeCheck';

/**
 * @type {Set<DataModel>}
 */
const skillLikeTypes = new Set();

/**
 *
 * @param {DataModel} model
 */
const registerSkillLikeType = (model) => {
	if (!foundry.utils.isSubclass(model, foundry.abstract.DataModel)) {
		throw new Error('Must be a DataModel');
	}
	skillLikeTypes.add(model);
};

/**
 * @param {FUItem} item
 * @param {KeyboardModifiers} modifiers
 * @return {Promise<void>}
 */
const roll = async (item, modifiers) => {
	if (item.system.hasRoll.value) {
		if (item.system.useWeapon.accuracy || item.system.damage.hasDamage) {
			return Checks.accuracyCheck(item.actor, item, initializeAccuracyCheck(modifiers));
		} else {
			return Checks.attributeCheck(
				item.actor,
				{
					primary: item.system.attributes.primary,
					secondary: item.system.attributes.secondary,
				},
				item,
				initializeAttributeCheck(modifiers),
			);
		}
	}
	return Checks.display(item.actor, item, initializeSkillDisplay(modifiers));
};

/**
 * @param modifiers
 * @return {CheckCallback}
 * @override
 */
const initializeAccuracyCheck = (modifiers) => {
	return async (check, actor, item) => {
		const config = CheckConfiguration.configure(check);
		const targets = config.getTargets();
		const context = ExpressionContext.fromTargetData(actor, item, targets);
		let weapon;

		if (item.system.useWeapon.accuracy || (item.system.damage.hasDamage && item.system.useWeapon.damage)) {
			weapon = await getWeapon(actor);
			if (weapon === false) {
				const error = game.i18n.localize('FU.AbilityNoWeaponEquipped');
				ui.notifications.error(error);
				throw new Error(error);
			} else if (weapon == null) {
				const error = game.i18n.localize('FU.AbilityNoWeaponSelected');
				ui.notifications.error(error);
				throw new Error(error);
			} else {
				config.setWeaponReference(weapon.item);
			}
		}

		if (item.system.useWeapon.accuracy) {
			const { check: weaponCheck, error } = await Checks.prepareCheckDryRun('accuracy', actor, weapon.item);
			if (error) {
				throw error;
			}
			if (weaponCheck) {
				const weaponCheckInspect = CheckConfiguration.inspect(weaponCheck);
				check.primary = weaponCheck.primary;
				check.secondary = weaponCheck.secondary;
				check.modifiers = check.modifiers.concat(weaponCheck.modifiers);
				if (weaponCheckInspect.getTargetedDefense()) {
					config.setTargetedDefense(weaponCheckInspect.getTargetedDefense());
				}
			}
		} else {
			check.primary = item.system.attributes.primary;
			check.secondary = item.system.attributes.secondary;
		}
		await configureCheck(config, actor, item);
		await addSkillAccuracy(config, actor, item, context);

		if (item.system.damage.hasDamage) {
			if (item.system.useWeapon.damage) {
				await addSkillDamage(config, item, context, weapon.data);
			} else {
				await addSkillDamage(config, item, context);
			}
			config.setHrZero(item.system.damage.hrZero || modifiers.shift);
		}
	};
};

/**
 * @param {KeyboardModifiers} modifiers
 * @return {CheckCallback}
 */
const initializeAttributeCheck = (modifiers) => {
	return async (check, actor, item) => {
		const config = CheckConfiguration.configure(check);
		const targets = config.getTargets();
		const context = ExpressionContext.fromTargetData(actor, item, targets);

		config.check.additionalData[skillForAttributeCheck] = item.parent.uuid;
		await configureCheck(config, actor, item);
		await addSkillAccuracy(config, actor, item, context);
		if (item.system.defense && targets.length === 1) {
			let dl;
			switch (item.system.defense) {
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
};

/**
 * @param {KeyboardModifiers} modifiers
 * @return {CheckCallback}
 * @remarks Expects a weapon
 */
const initializeSkillDisplay = (modifiers) => {
	return async (check, actor, item) => {
		const config = CheckConfiguration.configure(check);
		const targets = config.getTargets();
		const context = ExpressionContext.fromTargetData(actor, item, targets);

		await configureCheck(config, actor, item);
		if (item.system.damage.hasDamage) {
			if (item.system.useWeapon.damage) {
				const weapon = await getWeapon(actor);
				if (weapon) {
					config.setWeaponReference(weapon.item);
					await addSkillDamage(config, item, context, weapon.data);
				}
			} else {
				await addSkillDamage(config, item, context);
			}
		}
	};
};

/**
 * @desc Common configuration for attribute checks.
 * @param {CheckConfigurer} config
 * @param {FUActor} actor
 * @param {FUItem} item
 */
const configureCheck = async (config, actor, item) => {
	config.addTraits('skill');
	config.addTraitsFromItemModel(item.system.traits);
	config.setEffects(item.system.effects);
	config.addTraitsFromItemModel(item.system.traits);
	if (item.system.resource.enabled) {
		config.setResource(item.system.resource.type, item.system.resource.amount);
	}
	await ResourcePipeline.configureExpense(config, actor, item, item.system.cost);
};

/**
 * @desc Common configuration for display checks.
 * @param {CheckConfigurer} config
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {ExpressionContext} context
 */
const addSkillAccuracy = async (config, actor, item, context) => {
	if (item.system.accuracy) {
		const calculatedAccuracyBonus = await Expressions.evaluateAsync(item.system.accuracy, context);
		if (calculatedAccuracyBonus > 0) {
			config.check.modifiers.push({
				label: 'FU.CheckBonus',
				value: calculatedAccuracyBonus,
			});
		}
	}
	if (item.system.defense) {
		config.setTargetedDefense(item.system.defense);
	}
};

/**
 * @param {CheckConfigurer} config
 * @param {FUItem} item
 * @param {ExpressionContext} context
 * @param {WeaponData} weaponData
 * @returns {Promise<void>}
 */
const addSkillDamage = async (config, item, context, weaponData = undefined) => {
	if (item.system.damage.hasDamage) {
		config.addTraits(Traits.Damage);

		if (config.hasDamage) {
			config.modifyDamage((damage) => {
				damage.type = item.system.damage.type || damage.type;
				damage.addModifier('FU.DamageBonus', item.system.damage.value);
				return damage;
			});
		} else {
			config.setDamage(item.system.damage.type, item.system.damage.value);
		}

		// Weapon support
		if (weaponData) {
			if (item.system.useWeapon.traits) {
				if (weaponData.traits) {
					config.addTraitsFromItemModel(weaponData.traits);
				}
				config.setWeaponTraits({
					weaponType: weaponData.type,
					weaponCategory: weaponData.category ?? undefined,
					handedness: weaponData.handedness ?? undefined,
				});
				config.addTraits(ActionTraits.Attack);
			}
			if (item.system.useWeapon.damage) {
				// We do this in case we are using both a damage bonus AND weapon damage
				if (config.hasDamage) {
					config.modifyDamage((damage) => {
						damage.type = item.system.damage.type || weaponData.damage.type;
						damage.addModifier('FU.WeaponDamageBonus', weaponData.damage.value);
						return damage;
					});
				} else {
					config.setDamage(item.system.damage.type || weaponData.damage.type, weaponData.damage.value);
				}
			}
		}

		const onRoll = item.system.damage.onRoll;
		if (onRoll) {
			const extraDamage = await Expressions.evaluateAsync(onRoll, context);
			if (extraDamage > 0) {
				config.addDamageBonus('FU.DamageOnRoll', extraDamage);
			}
		}

		const onApply = item.system.damage.onApply;
		if (onApply) {
			config.setExtraDamage(onApply);
		}
	}
};

/**
 * @param {FUActor} actor
 * @returns {Promise<WeaponResolution>}
 */
const getWeapon = async (actor) => {
	return await WeaponResolver.prompt(actor, true);
};

/**
 * @type RenderCheckHook
 */
const onRenderAccuracyCheck = async (data, check, actor, item) => {
	if (check.type === 'accuracy' && skillLikeTypes.has(item?.system?.constructor)) {
		const inspector = CheckConfiguration.inspect(check);
		const weapon = await fromUuid(inspector.getWeaponReference());

		if (check.critical) {
			CommonSections.opportunity(data.sections, item.system.opportunity, CHECK_DETAILS);
		}

		let tags = item.system.getTags?.() ?? [];
		if (weapon) {
			if (item.system.useWeapon.traits && weapon.system.getTags instanceof Function) {
				tags.push(...weapon.system.getTags());
			}
		}
		data.tags.push(...tags);
		CommonSections.description(data.sections, item.system.description, item.system.summary.value, CHECK_DETAILS);

		if (item.system.hasClock?.value) {
			CommonSections.clock(data.sections, item.system.progress, ChatSectionOrder.tracker);
		}
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderAccuracyCheck);

/**
 * @type RenderCheckHook
 */
let onRenderAttributeCheck = async (data, check, actor, item, flags) => {
	if (check.type === 'attribute' && skillLikeTypes.has(item?.system?.constructor) && check.additionalData[skillForAttributeCheck]) {
		const skill = await fromUuid(check.additionalData[skillForAttributeCheck]);
		const inspector = CheckConfiguration.inspect(check);
		CommonSections.itemFlavor(data.sections, skill);
		data.tags.push(...(skill.system.getTags?.() ?? []));
		CommonSections.description(data.sections, skill.system.description, skill.system.summary.value, CHECK_DETAILS);
		CommonSections.actions(data, actor, item, [], flags, inspector);

		if (check.critical) {
			CommonSections.opportunity(data.sections, skill.system.opportunity, CHECK_DETAILS);
		}

		if (skill.system.hasResource?.value) {
			CommonSections.resource(data.sections, skill.system.rp, ChatSectionOrder.tracker);
		}
		if (skill.system.hasClock?.value) {
			CommonSections.clock(data.sections, item.system.progress, ChatSectionOrder.tracker);
		}
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderAttributeCheck);

/**
 * @type RenderCheckHook
 */
const onRenderDisplay = (data, check, actor, item, flags) => {
	if (check.type === 'display' && skillLikeTypes.has(item?.system?.constructor)) {
		data.tags.push(...(item.system.getTags?.() ?? []));
		CommonSections.description(data.sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		const inspector = CheckConfiguration.inspect(check);
		const targets = inspector.getTargetsOrDefault();
		// TODO: Find a better way to handle this, as it's needed when using a spell without accuracy
		if (!item.system.hasRoll.value) {
			CommonSections.actions(data, actor, item, targets, flags, inspector);
		}
		if (item.system.hasResource?.value) {
			CommonSections.resource(data.sections, item.system.rp, ChatSectionOrder.tracker);
		}
		CommonEvents.skill(actor, item);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderDisplay);

export const SkillLikeItemHelper = {
	registerSkillLikeType,
	roll,
	initializeAttributeCheck,
	initializeAccuracyCheck,
	initializeSkillDisplay,
};
