import { FU } from './config.mjs';
import { getTargeted } from './target-handler.mjs';

/**
 * Displays a dialog to customize damage.
 *
 * @param {Object} damage - The damage object containing type and total.
 * @param {Function} callback - The function to call when the user confirms.
 * @param {Function} onCancel - The function to call when the user cancels.
 */
export function DamageCustomizer(damage, targets, callback, onCancel) {
	// Map damage types to options with the current type selected
	const damageTypesOptions = Object.keys(FU.damageTypes)
		.map((type) => `<option value="${type}" ${type === damage.type ? 'selected' : ''}>${game.i18n.localize(FU.damageTypes[type])}</option>`)
		.join('');
	const tokenInfo = targets
		.map((token) => {
			const { img, name } = token;
			return `
            <div class="flexcol">
                <img src="${img}" style="width: 36px; height: 36px; vertical-align: middle; margin-right: 5px;">
                <strong>${name}</strong>
            </div><br>
        `;
		})
		.join('');

	// Create the content for the dialog
	const content = `
        <form>
			<div class="desc mb-3 gap-5">
				<div class="flexrow form-group targets-container">${tokenInfo}</div>
				<button type="button" id="retarget" class="btn">${game.i18n.localize('FU.ChatContextRetarget')}</button>
			</div>
            <div class="desc mb-3 grid grid-2col gap-5">
                <div class="inline-desc form-group" style="padding: 5px 10px;">
                    <label for="total-damage" class="resource-content resource-label" style="flex-grow: 8;"><b>${game.i18n.localize('FU.Total')}</b>
						<span id="total-damage">
							<b>${damage.total} ${game.i18n.localize(FU.damageTypes[damage.type])}</b>
						</span>
					</label>
                    <i id="total-damage-icon" class="icon ${FU.affIcon[damage.type]}" style="flex: 0 1 auto;"></i>
                </div>
                <div class="inline-desc form-group" style="padding: 5px 10px;">
                    <label for="total-extra-damage" class="resource-content resource-label" style="flex-grow: 8;"><b>${game.i18n.localize('FU.DamageExtra')}</b>
						<span id="extra-total-damage">
							<b>0 ${game.i18n.localize(FU.damageTypes[damage.type])}</b>
						</span>
					</label>
                    <i id="extra-damage-icon" class="icon ${FU.affIcon[damage.type]}" style="flex: 0 1 auto;"></i>
                </div>
            </div>
            <div class="desc mb-3 grid grid-2col gap-5">
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
						const ignoreVulnerable = html.find('[name="ignore-vulnerable"]').is(':checked');
						const ignoreResistance = html.find('[name="ignore-resistance"]').is(':checked');
						const ignoreImmunities = html.find('[name="ignore-immunities"]').is(':checked');
						const ignoreAbsorption = html.find('[name="ignore-absorption"]').is(':checked');

						// Create an object with the extra damage information
						const extraDamageInfo = {
							damageType,
							damageBonus,
							extraDamage,
							extraDamageType,
							hrZero,
							ignoreVulnerable,
							ignoreResistance,
							ignoreImmunities,
							ignoreAbsorption,
							targets,
						};

						// Execute the callback with the extra damage information and targets
						callback(extraDamageInfo, targets);
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
				const $damageBonusInput = html.find('#damage-bonus');
				const $hrZeroCheckbox = html.find('#hr-zero');
				const $totalDamageSpan = html.find('#total-damage');
				const $extraTotalDamageSpan = html.find('#extra-total-damage');
				const $damageTypeSelect = html.find('#damage-type');
				const $extraDamageInput = html.find('#extra-damage');
				const $extraDamageTypeSelect = html.find('#extra-damage-type');
				const $totalDamageIcon = html.find('#total-damage-icon');
				const $extraDamageIcon = html.find('#extra-damage-icon');
				const $checkAllButton = html.find('#check-all');
				const $checkNoneButton = html.find('#check-none');
				const $ignoreCheckboxes = html.find('.ignore');
				const $retargetButton = html.find('#retarget');

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

				// Handle check all and check none buttons
				$checkAllButton.on('click', () => {
					$ignoreCheckboxes.prop('checked', true);
				});

				$checkNoneButton.on('click', () => {
					$ignoreCheckboxes.prop('checked', false);
				});

				// Handle Retarget button click
				$retargetButton.on('click', async () => {
					// Call a function to get the new array of tokens
					const newTargets = await getTargeted(); // Implement this function to fetch new tokens

					// Update the dialog content with the new token info
					const newTokenInfo = newTargets
						.map((token) => {
							const { img, name } = token;
							return `
									<div class="flexcol">
										<img src="${img}" style="width: 36px; height: 36px; vertical-align: middle; margin-right: 5px;">
										<strong>${name}</strong>
									</div><br>
								`;
						})
						.join('');

					// Replace the existing token information with the new one
					html.find('.flexrow').html(newTokenInfo);

					// Update the targets array with the new tokens
					targets = newTargets;
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
			classes: ['dialog', 'backgroundstyle'],
		},
	).render(true);
}
