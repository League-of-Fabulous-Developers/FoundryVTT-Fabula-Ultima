import { FU } from '../helpers/config.mjs';

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
export function DamageCustomizer(damage, targets, callback, onCancel) {
	// Map damage types to options with the current type selected
	const damageTypesOptions = Object.keys(FU.damageTypes)
		.map((type) => `<option value="${type}" ${type === damage.type ? 'selected' : ''}>${game.i18n.localize(FU.damageTypes[type])}</option>`)
		.join('');

	// Create the content for the dialog
	const content = `
        <form>
            <div class="desc mb-3 gap-5">
                <div class="inline-desc form-group resource-content gap-5" style="padding: 5px 10px;">
                    <label for="total-damage" class="resource-label" style="flex-grow: 8;">
                        <b>${game.i18n.localize('FU.Total')}</b>
                        <span id="total-damage">
                            <b>${damage.total} ${game.i18n.localize(FU.damageTypes[damage.type])} + 0 Extra</b>
                        </span>
                    </label>
                    <i id="total-damage-icon" class="icon ${FU.affIcon[damage.type]}" style="flex: 0 1 auto;"></i>
                </div>
            </div>
            <div class="desc mb-3 grid grid-2col gap-2">
				<div class="form-group">
					<label for="extra-damage">
						<b>${game.i18n.localize('FU.DamageExtra')}</b>
					</label>
					<input id="extra-damage" name="extra-damage" type="number" value="0" />
				</div>
				<div class="form-group">
					<label for="damage-type"><b>${game.i18n.localize('FU.DamageType')}</b></label>
					<select id="damage-type" name="damage-type">${damageTypesOptions}</select>
				</div>
				<div class="form-group flex-auto">
					<label for="hr-zero"><b>${game.i18n.localize('FU.HRZeroStatus')}</b></label>
					<input id="hr-zero" name="hr-zero" type="checkbox" />
				</div>
            </div>
            <div class="desc grid grid-2col gap-5">
                <div class="gap-2 grid-span-2">
                    <div class="form-group">
                        <button type="button" id="check-all" class="btn">${game.i18n.localize('FU.IgnoreAll')}</button>
                        <button type="button" id="check-none" class="btn">${game.i18n.localize('FU.IgnoreNone')}</button>
                    </div>
                </div>
                <div class="gap-2">
                    <div class="form-group">
                        <label for="ignore-vulnerable"><b>${game.i18n.localize('FU.IgnoreVulnerable')}</b></label>
                        <input id="ignore-vulnerable" class="ignore" name="ignore-vulnerable" type="checkbox" />
                    </div>
                    <div class="form-group">
                        <label for="ignore-resistance"><b>${game.i18n.localize('FU.IgnoreResistances')}</b></label>
                        <input id="ignore-resistance" class="ignore" name="ignore-resistance" type="checkbox" />
                    </div>
                </div>
                <div class="gap-2">
                    <div class="form-group">
                        <label for="ignore-immunities"><b>${game.i18n.localize('FU.IgnoreImmunities')}</b></label>
                        <input id="ignore-immunities" class="ignore" name="ignore-immunities" type="checkbox" />
                    </div>
                    <div class="form-group">
                        <label for="ignore-absorption"><b>${game.i18n.localize('FU.IgnoreAbsorption')}</b></label>
                        <input id="ignore-absorption" class="ignore" name="ignore-absorption" type="checkbox" />
                    </div>
                </div>
            </div>
        </form>
		<hr>
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
						const damageType = html.find('[name="damage-type"]').val();
						const extraDamage = parseInt(html.find('[name="extra-damage"]').val(), 10) || 0;
						const hrZero = html.find('[name="hr-zero"]').is(':checked');
						const ignoreVulnerable = html.find('[name="ignore-vulnerable"]').is(':checked');
						const ignoreResistance = html.find('[name="ignore-resistance"]').is(':checked');
						const ignoreImmunities = html.find('[name="ignore-immunities"]').is(':checked');
						const ignoreAbsorption = html.find('[name="ignore-absorption"]').is(':checked');

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
					},
				},
				cancel: {
					label: 'Cancel',
					callback: () => {
						// Execute onCancel function if provided
						if (typeof onCancel === 'function') {
							onCancel();
						}
					},
				},
			},
			default: 'yes',
			render: (html) => {
				// Cache selectors
				const $hrZeroCheckbox = html.find('#hr-zero');
				const $totalDamageSpan = html.find('#total-damage');
				const $damageTypeSelect = html.find('#damage-type');
				const $extraDamageInput = html.find('#extra-damage');
				const $totalDamageIcon = html.find('#total-damage-icon');
				const $checkAllButton = html.find('#check-all');
				const $checkNoneButton = html.find('#check-none');
				const $ignoreCheckboxes = html.find('.ignore');

				// Function to update total damage and icons based on HR Zero status, and extra damage
				function updateTotalDamage() {
					const extraDamage = parseInt($extraDamageInput.val(), 10) || 0;
					const selectedDamageType = $damageTypeSelect.val();
					const baseDamage = $hrZeroCheckbox.is(':checked') ? damage.modifierTotal : damage.total;
					const totalDamage = baseDamage + extraDamage;

					$totalDamageSpan.html(`${baseDamage} (Base) + ${extraDamage} (Extra Damage) = ${totalDamage} ${game.i18n.localize(FU.damageTypes[selectedDamageType])}`);
					// Update icons
					$totalDamageIcon.attr('class', `icon ${FU.affIcon[selectedDamageType]}`);
				}

				// Initial update
				updateTotalDamage();

				// Update total damage and icons based on changes
				$hrZeroCheckbox.on('change', updateTotalDamage);
				$damageTypeSelect.on('change', updateTotalDamage);
				$extraDamageInput.on('input', updateTotalDamage);

				// Handle check all and check none buttons
				$checkAllButton.on('click', () => {
					$ignoreCheckboxes.prop('checked', true);
				});

				$checkNoneButton.on('click', () => {
					$ignoreCheckboxes.prop('checked', false);
				});
			},
			close: () => {
				// Execute onCancel function if provided
				if (typeof onCancel === 'function') {
					onCancel();
				}
			},
		},
		{
			width: 440,
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		},
	).render(true);
}
