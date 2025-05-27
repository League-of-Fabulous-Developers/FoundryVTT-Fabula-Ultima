import { SYSTEM } from '../helpers/config.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CommonSections } from './common-sections.mjs';
import { CommonEvents } from './common-events.mjs';
import { CheckConfiguration } from './check-configuration.mjs';

function handleGenericBonus(actor, modifiers) {
	if (actor.system.bonuses.accuracy.accuracyCheck) {
		modifiers.push({
			label: 'FU.AccuracyCheckBonusGeneric',
			value: actor.system.bonuses.accuracy.accuracyCheck,
		});
	}
}

/**
 * @type CheckCallback
 */
const handleWeaponTraitAccuracyBonuses = (check, actor, item) => {
	const weaponTraits = CheckConfiguration.inspect(check).getWeaponTraits();

	// Weapon Category
	if (weaponTraits.weaponCategory && actor.system.bonuses.accuracy[weaponTraits.weaponCategory]) {
		check.modifiers.push({
			label: `FU.AccuracyCheckBonus${weaponTraits.weaponCategory.capitalize()}`,
			value: actor.system.bonuses.accuracy[weaponTraits.weaponCategory],
		});
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
};

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

/**
 * Hook called to process the result of the roll
 * @param {CheckResultV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
const onProcessCheck = (check, actor, item) => {
	const { type, critical, fumble } = check;
	if (type === 'accuracy') {
		const configurer = CheckConfiguration.configure(check);
		configurer.modifyTargetedDefense((value) => value ?? 'def');
		// TODO: Refactor alongside magic-checks
		if (critical) {
			configurer.addTraits('critical');
		} else if (fumble) {
			configurer.addTraits('fumble');
		}
		configurer.modifyDamage((damage) => {
			if (damage) {
				const weaponTraits = CheckConfiguration.inspect(check).getWeaponTraits();

				// All Damage
				const globalBonus = actor.system.bonuses.damage.all;
				if (globalBonus) {
					damage.modifiers.push({ label: `FU.DamageBonusAll`, value: globalBonus });
				}
				// Attack Type
				if (weaponTraits.weaponType) {
					const attackTypeBonus = actor.system.bonuses.damage[weaponTraits.weaponType] ?? 0;
					if (attackTypeBonus) {
						damage.modifiers.push({ label: `FU.DamageBonusType${weaponTraits.weaponType.capitalize()}`, value: attackTypeBonus });
					}
				}
				// Weapon Category
				if (weaponTraits.weaponCategory) {
					const weaponCategoryBonus = actor.system.bonuses.damage[weaponTraits.weaponCategory] ?? 0;
					if (weaponCategoryBonus) {
						damage.modifiers.push({ label: `FU.DamageBonusCategory${weaponTraits.weaponCategory.capitalize()}`, value: weaponCategoryBonus });
					}
				}

				// Damage Type
				const damageTypeBonus = actor.system.bonuses.damage[damage.type];
				if (damageTypeBonus) {
					damage.modifiers.push({ label: `FU.DamageBonus${damage.type.capitalize()}`, value: damageTypeBonus });
				}
			}
			return damage;
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
		const accuracyData = inspector.getAccuracyData();
		const damageData = inspector.getDamageData();

		// Push combined data for accuracy and damage
		data.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/chat-check-container.hbs',
			data: {
				accuracy: accuracyData,
				damage: damageData,
			},
		});

		/** @type TargetData[] */
		const targets = inspector.getTargets();
		CommonSections.targeted(data, actor, item, targets, flags, accuracyData, damageData);
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
