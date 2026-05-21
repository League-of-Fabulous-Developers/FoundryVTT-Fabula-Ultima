import { FU } from '../config.mjs';
import { Expressions } from '../../expressions/expressions.mjs';
import { CompendiumIndex } from '../../ui/compendium/compendium-index.mjs';

/**
 * @param {FUItem} item
 * @return {FUItem|null}
 */
function resolveMainWeapon(item) {
	if ((item.system.useWeapon.accuracy || item.system.useWeapon.damage) && item.actor && item.actor.isCharacterType) {
		const mainHandItem = item.actor.items.get(item.actor.system.equipped.mainHand);
		if (mainHandItem && mainHandItem.type in FU.weaponItemTypes) {
			return mainHandItem;
		}
	}
	return null;
}

/**
 * @param {FUItem} item
 * @param {ExpressionContext} expressionContext
 * @param {FUItem} weapon
 * @return {Promise<{}>}
 */
async function resolveCheckData(item, expressionContext, weapon) {
	const data = {};
	if (item.system.hasRoll.value) {
		let itemAccuracyBonus = 0;
		if (item.system.accuracy) {
			itemAccuracyBonus = await Expressions.evaluateAsync(item.system.accuracy, expressionContext);
		}

		if (item.system.useWeapon.accuracy) {
			data.useWeaponAccuracy = true;
			if (weapon) {
				if (weapon.type === 'weapon') {
					let weaponAccuracyBonus = 0;
					if (weapon.system.accuracy.value) {
						weaponAccuracyBonus = await Expressions.evaluateAsync(weapon.system.accuracy.value, expressionContext);
					}
					data.roll = {
						primary: weapon.system.attributes.primary.value,
						secondary: weapon.system.attributes.secondary.value,
						modifier: weaponAccuracyBonus + itemAccuracyBonus,
					};
				}
				if (weapon.type === 'customWeapon') {
					let weaponAccuracyBonus = 0;
					if (weapon.system.accuracy) {
						weaponAccuracyBonus = await Expressions.evaluateAsync(weapon.system.accuracy, expressionContext);
					}
					data.roll = {
						primary: weapon.system.attributes.primary,
						secondary: weapon.system.attributes.secondary,
						modifier: weaponAccuracyBonus + itemAccuracyBonus,
					};
				}
			}
		} else {
			data.roll = {
				primary: item.system.attributes.primary,
				secondary: item.system.attributes.secondary,
				modifier: itemAccuracyBonus,
			};
		}
	}
	return data;
}

/**
 * @param {FUItem} item
 * @param {ExpressionContext} expressionContext
 * @param {FUItem} weapon
 * @return {Promise<{}>}
 */
async function resolveDamageData(item, expressionContext, weapon) {
	const data = {};
	if (item.system.damage.hasDamage) {
		if (item.system.useWeapon.damage) {
			data.useWeaponDamage = true;
			if (weapon) {
				let weaponDamageValue = 0;
				let weaponDamageType;
				if (weapon.type === 'weapon') {
					if (weapon.system.damage.value) {
						weaponDamageValue = await Expressions.evaluateAsync(weapon.system.damage.value, expressionContext);
					}
					weaponDamageType = weapon.system.damageType.value;
				} else if (weapon.type === 'customWeapon') {
					if (weapon.system.damage.value) {
						weaponDamageValue = await Expressions.evaluateAsync(weapon.system.damage.value, expressionContext);
					}
					weaponDamageType = weapon.system.damage.type;
				} else {
					throw new Error('Missing weapon damage data. This is a bug, please report it to the maintainers of the system.');
				}

				let itemDamageValue = 0;
				if (item.system.damage.value) {
					itemDamageValue = await Expressions.evaluateAsync(item.system.damage.value, expressionContext);
				}
				data.damage = {
					value: itemDamageValue + weaponDamageValue,
					type: item.system.damage.type || weaponDamageType,
					hrZero: item.system.damage.hrZero,
				};
			}
		} else {
			data.damage = {
				value: item.system.damage.value,
				type: item.system.damage.type,
				hrZero: item.system.damage.hrZero,
			};
		}
	}
	return data;
}

/**
 * @param {FUItem} item
 * @param {FUItem[]} classes
 * @return {{fuid}|*|null}
 */
function findMatchingClassInArray(item, classes) {
	const className = item.system?.class?.value;
	if (className && classes) {
		// Search for a class with the same name. If found, set the skill's class attribute to match its fu-id
		const classFound = classes.find((classItem) => {
			return classItem.name === className;
		});
		if (classFound?.system?.fuid) {
			return classFound;
		}

		// Search for a class with a fuid that matches the slugified attribute.
		const classNameSlug = game.projectfu.util.slugify(className);
		const classFoundWithFuid = classes.find((classItem) => {
			return classItem.system?.fuid === classNameSlug;
		});
		if (classFoundWithFuid?.system?.fuid) {
			return classFoundWithFuid;
		}
	}
	return null;
}

/**
 * @param {FUItem} item
 * @return {Promise<FUItem|null>}
 */
async function findMatchingClass(item) {
	if (item.system.class.value) {
		const actorClasses = item.actor?.items.filter((arrayItem) => {
			return arrayItem.type === 'class';
		});
		const foundActorClass = findMatchingClassInArray(item, actorClasses);
		if (foundActorClass) {
			return foundActorClass;
		}

		const worldClasses = game.items.filter((arrayItem) => {
			return arrayItem.type === 'class';
		});
		const foundWorldClass = findMatchingClassInArray(item, worldClasses);
		if (foundWorldClass) {
			return foundWorldClass;
		}

		const compendiumClasses = await CompendiumIndex.instance.getClasses();
		if (compendiumClasses?.class) {
			const foundCompendiumClass = findMatchingClassInArray(item, compendiumClasses.class);
			if (foundCompendiumClass) {
				return foundCompendiumClass;
			}
		}
	}
	return null;
}

export const SkillLikeTableHelper = {
	resolveMainWeapon,
	resolveCheckData,
	resolveDamageData,
	findMatchingClass,
};
