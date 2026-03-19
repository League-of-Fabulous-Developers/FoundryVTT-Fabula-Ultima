import { FU } from '../../../helpers/config.mjs';
import { CharacterDataModel } from '../../actors/character/character-data-model.mjs';
import { NpcDataModel } from '../../actors/npc/npc-data-model.mjs';
import FoundryUtils from '../../../helpers/foundry-utils.mjs';

/**
 * @typedef WeaponResolution
 * @property {FUItem} item
 * @property {WeaponData} data The normalized weapon data.
 */

/**
 * @param {FUActor} actor
 * @param {'mainHand', 'offHand', 'phantom', 'armor'} slot
 * @return {FUItem|null}
 */
function getWeapon(actor, slot) {
	return (
		[actor.system.equipped[slot]]
			.filter((value) => value)
			.map((value) => actor.items.get(value))
			.filter((value) => value)
			.filter((value) => value.type in FU.weaponItemTypes)
			.at(0) ?? null
	);
}

/**
 * @param {FUActor} actor
 * @param {Boolean} includeWeaponModules
 * @returns {FUItem[]}
 */
function getEquippedWeapons(actor, includeWeaponModules) {
	let equippedWeapons = [];

	if (actor.system instanceof CharacterDataModel) {
		if (includeWeaponModules && actor.system.vehicle.embarked && actor.system.vehicle.weapons.length > 0) {
			let modules = actor.system.vehicle.weapons;
			modules = modules.filter((w) => w.system.data.type !== 'shield');
			equippedWeapons.push(...modules);
		} else {
			const mainHand = getWeapon(actor, 'mainHand');
			const offHand = getWeapon(actor, 'offHand');
			const phantomHand = getWeapon(actor, 'phantom');
			const armor = getWeapon(actor, 'armor');

			equippedWeapons.push(...new Set([mainHand, offHand, phantomHand, armor]));
		}
	}
	if (actor.system instanceof NpcDataModel) {
		if (actor.system.useEquipment.value) {
			const mainHand = getWeapon(actor, 'mainHand');
			const offHand = getWeapon(actor, 'offHand');
			const armor = getWeapon(actor, 'armor');

			equippedWeapons.push(...new Set([mainHand, offHand, armor]));
		} else {
			equippedWeapons.push(...actor.itemTypes.basic);
		}
	}

	equippedWeapons = equippedWeapons.filter((value) => value != null);
	return equippedWeapons;
}

/**
 * @param {FUActor} actor
 * @param {boolean=false} includeWeaponModules
 * @return {Promise<WeaponResolution|null|false>} chosen weapon or false for no equipped weapons or null for no selection
 */
async function prompt(actor, includeWeaponModules = false) {
	const equippedWeapons = getEquippedWeapons(actor, includeWeaponModules);
	if (!equippedWeapons.length) {
		return false;
	}

	// IF there's only one equipped weapon
	if (equippedWeapons.length === 1) {
		return {
			item: equippedWeapons[0],
			data: normalizeData(equippedWeapons[0]),
		};
	}

	const title = game.i18n.localize('FU.ChooseWeaponDialogTitle');
	const data = {
		equippedWeapons,
		FU,
	};
	const content = await FoundryUtils.renderTemplate('dialog/dialog-choose-weapon', data);
	const result = await FoundryUtils.input(title, content);
	if (result && result.selected) {
		const item = actor.items.get(result.selected) ?? null;
		if (item) {
			return {
				item: item,
				data: normalizeData(item),
			};
		}
		return null;
	} else {
		return null;
	}
}

/**
 * @param {FUItem} weapon
 * @returns {WeaponData}
 */
function normalizeData(weapon) {
	switch (weapon.type) {
		case 'weapon': {
			/** @type WeaponDataModel **/
			const system = weapon.system;
			return {
				type: system.type.value,
				category: system.category.value,
				handedness: system.hands.value,
				accuracy: {
					primary: system.attributes.primary.value,
					secondary: system.attributes.secondary.value,
					bonus: system.accuracy.value,
					defense: system.defense,
				},
				damage: {
					type: system.damageType.value,
					value: system.damage.value,
				},
				traits: system.traits,
			};
		}

		case 'customWeapon': {
			/** @type CustomWeaponDataModel **/
			const system = weapon.system;
			const form = system.getActiveForm();
			if (!form) {
				return undefined;
			}
			return {
				type: form.type,
				category: form.category,
				handedness: 'two-handed',
				accuracy: {
					primary: form.attributes.primary,
					secondary: form.attributes.secondary,
					bonus: form.accuracy,
					defense: system.defense,
				},
				damage: form.damage,
				traits: system.traits,
			};
		}

		// Weapon Modules
		case 'classFeature': {
			/** @type WeaponModuleDataModel **/
			const system = weapon.system.data;
			return {
				type: system.type,
				category: system.category,
				handedness: 'one-handed',
				accuracy: {
					primary: system.accuracy.attr1,
					secondary: system.accuracy.attr2,
					bonus: system.accuracy.modifier,
					defense: system.accuracy.defense,
				},
				damage: {
					type: system.damage.type,
					value: system.damage.bonus,
				},
				traits: system.traits,
			};
		}

		// NPC Attacks
		case 'basic': {
			/** @type BasicItemDataModel **/
			const system = weapon.system;
			return {
				type: system.type.value,
				accuracy: {
					primary: system.attributes.primary.value,
					secondary: system.attributes.secondary.value,
					defense: system.defense,
					bonus: system.accuracy.value,
				},
				damage: {
					type: system.damageType.value,
					value: system.damage.value,
				},
				traits: system.traits,
			};
		}
	}
	return undefined;
}

/**
 * @param {FUItem} weapon
 */
function getAccuracy(weapon) {
	let accuracy = 0;
	switch (weapon.type) {
		case 'weapon':
			accuracy = weapon.system.accuracy.value;
			break;

		case 'customWeapon':
			accuracy = weapon.system.accuracy;
			break;

		// Weapon Modules
		case 'classFeature':
			accuracy = weapon.system.data.accuracy.modifier;
			break;
	}
	return accuracy;
}

export const WeaponResolver = Object.freeze({
	prompt,
	getWeapon,
	getEquippedWeapons,
	getAccuracy,
});
