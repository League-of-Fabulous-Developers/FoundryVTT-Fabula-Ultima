import { WeaponDataModel } from '../weapon/weapon-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CharacterDataModel } from '../../actors/character/character-data-model.mjs';
import { NpcDataModel } from '../../actors/npc/npc-data-model.mjs';

/**
 * @param {FUActor} actor
 * @param {"mainHand", "offHand", "phantom", "armor"} slot
 * @return {FUItem|null}
 */
function getWeapon(actor, slot) {
	return (
		[actor.system.equipped[slot]]
			.filter((value) => value)
			.map((value) => actor.items.get(value))
			.filter((value) => value)
			.filter((value) => value.system instanceof WeaponDataModel)
			.at(0) ?? null
	);
}

/**
 * @param {FUActor} actor
 * @param {boolean=false} includeWeaponModules
 * @return {Promise<FUItem|null|false>} chosen weapon or false for no equipped weapons or null for no selection
 */
async function prompt(actor, includeWeaponModules = false) {
	let equippedWeapons = [];

	if (actor.system instanceof CharacterDataModel) {
		if (includeWeaponModules && actor.system.vehicle.embarked && actor.system.vehicle.weapons.length > 0) {
			equippedWeapons.push(...actor.system.vehicle.weapons);
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

	if (!equippedWeapons.length) {
		return false;
	}

	if (equippedWeapons.length === 1) {
		return equippedWeapons[0];
	}

	const data = {
		equippedWeapons,
		FU,
	};

	const content = await renderTemplate('/systems/projectfu/templates/dialog/dialog-choose-weapon.hbs', data);

	const selectedWeapon = await new Promise((resolve) => {
		const dialog = new Dialog({
			title: game.i18n.localize('FU.ChooseWeaponDialogTitle'),
			label: game.i18n.localize('FU.Submit'),
			rejectClose: false,
			content: content,
			render: (jQuery) => {
				jQuery.find('[data-item-id][data-action=select]').on('click', function () {
					resolve(actor.items.get(this.dataset.itemId) ?? null);
					dialog.close();
				});
			},
			close: () => resolve(null),
			buttons: {},
		});
		dialog.render(true);
	});

	if (selectedWeapon) {
		return selectedWeapon;
	} else {
		return null;
	}
}

export const ChooseWeaponDialog = Object.freeze({
	prompt,
});
