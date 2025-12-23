import { SYSTEM } from '../helpers/config.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CommonSections } from './common-sections.mjs';
import { CommonEvents } from './common-events.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { DamageCustomizerV2 } from '../ui/damage-customizer-v2.mjs';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const onPrepareCheck = (check, actor, item, registerCallback) => {
	const { type, modifiers } = check;
	if (type === 'accuracy') {
		handleGenericBonus(actor, modifiers);
		registerCallback(handleWeaponTraitAccuracyBonuses, Number.MAX_VALUE);
	}
};

function handleGenericBonus(actor, modifiers) {
	if (actor.system.bonuses.accuracy.accuracyCheck) {
		modifiers.push({
			label: 'FU.AccuracyCheckBonusGeneric',
			value: actor.system.bonuses.accuracy.accuracyCheck,
		});
	}
}

const critThresholdFlags = {
	all: 'critThreshold.accuracyCheck.all',
	melee: 'critThreshold.accuracyCheck.melee',
	ranged: 'critThreshold.accuracyCheck.ranged',
	arcane: 'critThreshold.accuracyCheck.arcane',
	bow: 'critThreshold.accuracyCheck.bow',
	brawling: 'critThreshold.accuracyCheck.brawling',
	dagger: 'critThreshold.accuracyCheck.dagger',
	firearm: 'critThreshold.accuracyCheck.firearm',
	flail: 'critThreshold.accuracyCheck.flail',
	heavy: 'critThreshold.accuracyCheck.heavy',
	spear: 'critThreshold.accuracyCheck.spear',
	sword: 'critThreshold.accuracyCheck.sword',
	thrown: 'critThreshold.accuracyCheck.thrown',
};

/**
 * @type CheckCallback
 */
const handleWeaponTraitAccuracyBonuses = (check, actor, item) => {
	const weaponTraits = CheckConfiguration.inspect(check).getWeaponTraits();

	{
		const flag = actor.getFlag(SYSTEM, critThresholdFlags.all);
		if (flag) {
			check.critThreshold = Math.min(check.critThreshold, Number(flag));
		}
	}

	// Weapon Category
	if (weaponTraits.weaponCategory) {
		if (actor.system.bonuses.accuracy[weaponTraits.weaponCategory]) {
			check.modifiers.push({
				label: `FU.AccuracyCheckBonus${weaponTraits.weaponCategory.capitalize()}`,
				value: actor.system.bonuses.accuracy[weaponTraits.weaponCategory],
			});
		}

		const flag = actor.getFlag(SYSTEM, critThresholdFlags[weaponTraits.weaponCategory]);
		if (flag) {
			check.critThreshold = Math.min(check.critThreshold, Number(flag));
		}
	}

	// Attack Type
	const attackType = weaponTraits.weaponType;
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

	{
		const flag = actor.getFlag(SYSTEM, critThresholdFlags[weaponTraits.weaponType]);
		if (flag) {
			check.critThreshold = Math.min(check.critThreshold, Number(flag));
		}
	}
};

/**
 * Hook called to process the result of the roll
 * @type ProcessCheckHook
 */
const onProcessCheck = (check, actor, item, registerCallback) => {
	const { type, critical, fumble } = check;
	if (type === 'accuracy') {
		const config = CheckConfiguration.configure(check);
		config.modifyTargetedDefense((value) => value ?? 'def');
		// TODO: Refactor alongside magic-checks
		if (critical) {
			config.addTraits('critical');
		} else if (fumble) {
			config.addTraits('fumble');
		}
		config.modifyDamage((damage) => {
			if (damage) {
				const weaponTraits = CheckConfiguration.inspect(check).getWeaponTraits();

				// All Damage
				const globalBonus = actor.system.bonuses.damage.all;
				if (globalBonus) {
					damage.addModifier(`FU.DamageBonusAll`, globalBonus);
				}
				// Attack Type
				if (weaponTraits.weaponType) {
					const attackTypeBonus = actor.system.bonuses.damage[weaponTraits.weaponType] ?? 0;
					if (attackTypeBonus) {
						damage.addModifier(`FU.DamageBonusType${weaponTraits.weaponType.capitalize()}`, attackTypeBonus);
					}
				}
				// Weapon Category
				if (weaponTraits.weaponCategory) {
					const weaponCategoryBonus = actor.system.bonuses.damage[weaponTraits.weaponCategory] ?? 0;
					if (weaponCategoryBonus) {
						damage.addModifier(`FU.DamageBonusCategory${weaponTraits.weaponCategory.capitalize()}`, weaponCategoryBonus);
					}
				}

				// Damage Type
				const damageTypeBonus = actor.system.bonuses.damage[damage.type];
				if (damageTypeBonus) {
					damage.addModifier(`FU.DamageBonus${damage.type.capitalize()}`, damageTypeBonus);
				}
			}
			return damage;
		});

		registerCallback(async (check, actor, item) => {
			if (config.hasDamage) {
				await CommonEvents.calculateDamage(actor, item, config);
				const damage = config.getDamage();
				if (damage.customizable) {
					await DamageCustomizerV2.open(damage);
				}
			}
		});
	}
};

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} checkResult
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {Object} flags
 */
function onRenderCheck(data, checkResult, actor, item, flags) {
	if (checkResult.type === 'accuracy') {
		const inspector = CheckConfiguration.inspect(checkResult);
		/** @type TargetData[] */
		const targets = inspector.getTargets();
		CommonSections.actions(data, actor, item, targets, flags, inspector);
		CommonEvents.attack(inspector, actor, item);
		(flags[SYSTEM] ??= {})[Flags.ChatMessage.Item] ??= item.toObject();
	}
}

const initialize = () => {
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.processCheck, onProcessCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const AccuracyCheck = Object.freeze({
	initialize,
});
