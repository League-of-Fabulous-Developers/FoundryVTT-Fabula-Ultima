import { FU, systemPath } from '../helpers/config.mjs';

/**
 * @typedef DamageType
 * @type {import('../helpers/config.mjs').DamageType}
 */

/**
 * @typedef DamageOverrideInfo
 * @prop {DamageType} damageType
 * @prop {number} extraDamage
 * @prop {boolean} hrZero
 * @prop {boolean} ignoreVulnerable
 * @prop {boolean} ignoreResistance
 * @prop {boolean} ignoreImmunities
 * @prop {boolean} ignoreAbsorption
 * @prop {FUActor[]} targets
 */

/**
 * @callback DamageOverrideCallback
 * @param {DamageOverrideInfo} damageOverride
 * @param {FUActor[]} targets
 * @returns {void}
 */

/**
 * Displays a dialog to customize damage.
 *
 * @param {DamageData} damage - The damage object containing type and total.
 * @param {FUActor[]} targets - The specified targets.
 * @param {DamageOverrideCallback} callback - The function to call when the user confirms.
 * @param {() => void} onCancel - The function to call when the user cancels.
 */
export async function DamageCustomizer(damage, targets, callback, onCancel) {
	// Create and render the dialog
	const result = await foundry.applications.api.DialogV2.input({
		window: {
			title: game.i18n.localize('FU.DamageCustomizer'),
		},
		position: {
			width: 440,
		},
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		content: await foundry.applications.handlebars.renderTemplate(systemPath('templates/dialog/dialog-damage-customizer.hbs'), {
			FU,
			damage,
		}),
		rejectClose: false,
		ok: {
			icon: "<i class='fas fa-check'></i>",
			label: 'FU.Confirm',
		},
		render: (event, dialog) => {
			// Cache selectors
			const hrZeroCheckbox = dialog.element.querySelector('#hr-zero');
			const totalDamageSpan = dialog.element.querySelector('#total-damage');
			const damageTypeSelect = dialog.element.querySelector('#damage-type');
			const extraDamageInput = dialog.element.querySelector('#extra-damage');
			const totalDamageIcon = dialog.element.querySelector('#total-damage-icon');
			const checkAllButton = dialog.element.querySelector('#check-all');
			const checkNoneButton = dialog.element.querySelector('#check-none');
			const ignoreCheckboxes = dialog.element.querySelectorAll('.ignore');

			// Function to update total damage and icons based on HR Zero status, and extra damage
			function updateTotalDamage() {
				const extraDamage = parseInt(extraDamageInput.value, 10) || 0;
				const selectedDamageType = damageTypeSelect.value;
				const baseDamage = hrZeroCheckbox.checked ? damage.modifierTotal : damage.total;
				const totalDamage = baseDamage + extraDamage;

				totalDamageSpan.textContent = `${baseDamage} (Base) + ${extraDamage} (Extra Damage) = ${totalDamage} ${game.i18n.localize(FU.damageTypes[selectedDamageType])}`;
				// Update icons
				totalDamageIcon.classList.value = `icon ${FU.affIcon[selectedDamageType]}`;
			}

			// Initial update
			updateTotalDamage();

			// Update total damage and icons based on changes
			hrZeroCheckbox.addEventListener('change', updateTotalDamage);
			damageTypeSelect.addEventListener('change', updateTotalDamage);
			extraDamageInput.addEventListener('input', updateTotalDamage);

			// Handle check all and check none buttons
			checkAllButton.addEventListener('click', () => {
				ignoreCheckboxes.forEach((el) => (el.checked = true));
			});

			checkNoneButton.addEventListener('click', () => {
				ignoreCheckboxes.forEach((el) => (el.checked = false));
			});
		},
	});

	if (result) {
		console.log(result);
		// Retrieve values from the form
		const damageType = result['damage-type'];
		const extraDamage = parseInt(result['extra-damage'], 10) || 0;
		const hrZero = result['hr-zero'];
		const ignoreVulnerable = result['ignore-vulnerable'];
		const ignoreResistance = result['ignore-resistance'];
		const ignoreImmunities = result['ignore-immunities'];
		const ignoreAbsorption = result['ignore-absorption'];

		// Create an object with the extra damage information
		const damageOverride = {
			damageType,
			extraDamage,
			hrZero,
			ignoreVulnerable,
			ignoreResistance,
			ignoreImmunities,
			ignoreAbsorption,
			targets,
		};

		// Execute the callback with the extra damage information and targets
		callback(damageOverride, targets);
	} else {
		if (typeof onCancel === 'function') {
			onCancel();
		}
	}
}
