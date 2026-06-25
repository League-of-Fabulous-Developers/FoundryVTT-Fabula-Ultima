import { SYSTEM } from '../helpers/config.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CommonSections } from './common-sections.mjs';
import { CommonEvents } from './common-events.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { BonusesDataModel } from '../documents/actors/common/bonuses-data-model.mjs';

const ACCURACY_PREPARED = 'accuracyPrepared';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const onPrepareCheck = (check, actor, item, registerCallback) => {
	const { type, modifiers, additionalData } = check;
	if (type === 'accuracy' && additionalData[ACCURACY_PREPARED] !== true) {
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
	{
		const flag = actor.getFlag(SYSTEM, critThresholdFlags.all);
		if (flag) {
			check.critThreshold = Math.min(check.critThreshold, Number(flag));
		}
	}

	const weaponTraits = CheckConfiguration.inspect(check).getWeaponTraits();
	if (weaponTraits) {
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
		if (attackType) {
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
			const flag = actor.getFlag(SYSTEM, critThresholdFlags[attackType]);
			if (flag) {
				check.critThreshold = Math.min(check.critThreshold, Number(flag));
			}
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
		// TODO: Refactor alongside magic-checks
		// Fallback if no defense was ever set
		config.modifyTargetedDefense((value) => value ?? 'def');
		if (critical) {
			config.addTraits('critical');
		} else if (fumble) {
			config.addTraits('fumble');
		}
		config.modifyDamage((damage) => {
			const weaponTraits = CheckConfiguration.inspect(check).getWeaponTraits();
			damage.addModifiers(BonusesDataModel.collectDamageBonuses(actor.system.bonuses, damage.type, weaponTraits));
			return damage;
		});
	}
};

/** @type RenderCheckHook */
const onRenderCheck = (data, checkResult, actor, item, flags) => {
	if (checkResult.type === 'accuracy') {
		const inspector = CheckConfiguration.inspect(checkResult);
		/** @type TargetData[] */
		const targets = inspector.getTargets();
		CommonSections.actions(data, actor, item, targets, flags, inspector);
		CommonEvents.attack(inspector, actor, item);
		(flags[SYSTEM] ??= {})[Flags.ChatMessage.Item] ??= item.uuid;
	}
};

const initialize = () => {
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.processCheck, onProcessCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

/**
 * Mark a check as having their accuracy bonuses already prepared, skipping the accuracy processing during `prepareCheck`.
 * Useful for cases where bonuses are taken from a check dry run.
 * @param {CheckV2} check
 */
const markPrepared = (check) => {
	check.additionalData[ACCURACY_PREPARED] = true;
};

export const AccuracyCheck = Object.freeze({
	initialize,
	markPrepared,
});
