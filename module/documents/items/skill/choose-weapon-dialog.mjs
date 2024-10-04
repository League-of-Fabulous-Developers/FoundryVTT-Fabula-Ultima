import { WeaponDataModel } from '../weapon/weapon-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';

/**
 * @param {FUActor} actor
 * @param {"mainHand", "offHand", "armor"} slot
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
 * @return {Promise<FUItem|null|false>} chosen weapon or false for no equipped weapons or null for no selection
 */
async function prompt(actor) {
	const mainHand = getWeapon(actor, 'mainHand');
	const offHand = getWeapon(actor, 'offHand');
	const armor = getWeapon(actor, 'armor');

	const equippedWeapons = [mainHand, offHand, armor].filter((value) => value);

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
			title: 'FU.ChooseWeaponDialogTitle',
			label: 'FU.Submit',
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

globalThis.ChooseWeaponDialog = ChooseWeaponDialog;
