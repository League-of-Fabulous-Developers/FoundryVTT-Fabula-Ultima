import { FU } from './config.mjs';

/**
 * Displays a dialog to customize damage.
 *
 * @param {Object} damage - The damage object containing type and total.
 * @param {Function} callback - The function to call when the user confirms.
 * @param {Function} onCancel - The function to call when the user cancels.
 */
export function DamageCustomizer(damage, callback, onCancel) {
	// Map damage types to options with the current type selected
	const damageTypesOptions = Object.keys(FU.damageTypes)
		.map((type) => `<option value="${type}" ${type === damage.type ? 'selected' : ''}>${game.i18n.localize(FU.damageTypes[type])}</option>`)
		.join('');

	// Create the content for the dialog
	const content = `
        <form>
            <div class="desc mb-3 grid grid-2col">
                <div class="form-group">
                    <label for="total-damage"><b>${game.i18n.localize('FU.Total')}</b></label>
                    <span id="total-damage">
                        <b>${damage.total} ${game.i18n.localize(FU.damageTypes[damage.type])}</b>
                    </span>
                    <i id="total-damage-icon" class="icon ${FU.affIcon[damage.type]}"></i>
                </div>
                <div class="form-group">
                    <label for="total-extra-damage" style="flex-grow: 4;"><b>${game.i18n.localize('FU.DamageExtra')}</b></label>
                    <span id="extra-total-damage">
                        <b>0 ${game.i18n.localize(FU.damageTypes[damage.type])}</b>
                    </span>
                    <i id="extra-damage-icon" class="icon ${FU.affIcon[damage.type]}"></i>
                </div>
            </div>
            <div class="desc grid grid-2col gap-5">
                <div class="gap-2">
                    <div class="form-group">
                        <label for="damage-bonus"><b>${game.i18n.localize('FU.DamageBonus')}</b></label>
                        <input id="damage-bonus" name="damage-bonus" type="number" value="0" />
                    </div>
                    <div class="form-group">
                        <label for="damage-type"><b>${game.i18n.localize('FU.DamageType')}</b></label>
                        <select id="damage-type" name="damage-type">${damageTypesOptions}</select>
                    </div>
                    <div class="form-group">
                        <label for="hr-zero"><b>${game.i18n.localize('FU.HRZeroStatus')}</b></label>
                        <input id="hr-zero" name="hr-zero" type="checkbox" />
                    </div>
                </div>
                <div class="gap-2">
                    <div class="form-group">
                        <label for="extra-damage"><b>${game.i18n.localize('FU.DamageExtra')}</b></label>
                        <input id="extra-damage" name="extra-damage" type="number" value="0" />
                    </div>
                    <div class="form-group">
                        <label for="extra-damage-type"><b>${game.i18n.localize('FU.DamageTypeExtra')}</b></label>
                        <select id="extra-damage-type" name="extra-damage-type">${damageTypesOptions}</select>
                    </div>
                </div>
            </div>
        </form>
    `;

	// Create and render the dialog
	new Dialog(
		{
			title: game.i18n.localize('FU.DamageCustomizer'),
			content,
			buttons: {
				yes: {
					icon: "<i class='fas fa-check'></i>",
					label: 'Apply',
					callback: (html) => {
						// Retrieve values from the form
						const damageBonus = parseFloat(html.find('[name="damage-bonus"]').val()) || 0;
						const damageType = html.find('[name="damage-type"]').val();
						const extraDamage = parseInt(html.find('[name="extra-damage"]').val(), 10) || 0;
						const extraDamageType = html.find('[name="extra-damage-type"]').val();
						const hrZero = html.find('[name="hr-zero"]').is(':checked');

						// Create an object with the extra damage information
						const extraDamageInfo = {
							damageType,
							damageBonus,
							extraDamage,
							extraDamageType,
							hrZero,
						};

						// Execute the callback with the extra damage information
						callback(extraDamageInfo);
					},
				},
				no: {
					icon: "<i class='fas fa-times'></i>",
					label: 'Cancel',
					callback: onCancel,
				},
			},
			default: 'yes',
			render: (html) => {
				// Cache selectors
				const $damageBonusInput = html.find('#damage-bonus');
				const $hrZeroCheckbox = html.find('#hr-zero');
				const $totalDamageSpan = html.find('#total-damage');
				const $extraTotalDamageSpan = html.find('#extra-total-damage');
				const $damageTypeSelect = html.find('#damage-type');
				const $extraDamageInput = html.find('#extra-damage');
				const $extraDamageTypeSelect = html.find('#extra-damage-type');
				const $totalDamageIcon = html.find('#total-damage-icon');
				const $extraDamageIcon = html.find('#extra-damage-icon');

				// Function to update total damage and icons based on the damage bonus, HR Zero status, and extra damage
				function updateTotalDamage() {
					const damageBonus = parseFloat($damageBonusInput.val()) || 0;
					const extraDamage = parseInt($extraDamageInput.val(), 10) || 0;
					const selectedDamageType = $damageTypeSelect.val();
					const selectedExtraDamageType = $extraDamageTypeSelect.val();
					const baseDamage = $hrZeroCheckbox.is(':checked') ? damage.modifierTotal : damage.total;
					const totalDamage = baseDamage + damageBonus;

					$totalDamageSpan.html(`${totalDamage} (${game.i18n.localize(FU.damageTypes[selectedDamageType])})`);
					$extraTotalDamageSpan.html(`${extraDamage} (${game.i18n.localize(FU.damageTypes[selectedExtraDamageType])})`);

					// Update icons
					$totalDamageIcon.attr('class', `icon ${FU.affIcon[selectedDamageType]}`);
					$extraDamageIcon.attr('class', `icon ${FU.affIcon[selectedExtraDamageType]}`);
				}

				// Initial update
				updateTotalDamage();

				// Update total damage and icons based on changes
				$damageBonusInput.on('input', updateTotalDamage);
				$hrZeroCheckbox.on('change', updateTotalDamage);
				$damageTypeSelect.on('change', updateTotalDamage);
				$extraDamageInput.on('input', updateTotalDamage);
				$extraDamageTypeSelect.on('change', updateTotalDamage);
			},
		},
		{
			width: 420,
			classes: ['dialog', 'backgroundstyle'],
		},
	).render(true);
}
