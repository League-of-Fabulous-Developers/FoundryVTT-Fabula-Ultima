import { FU } from '../helpers/config.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';

export class DamageCustomizerV2 {
	/**
	 * @desc Displays a dialog to customize damage.
	 * @param {DamageData} damageData
	 */
	async #open(damageData) {
		const context = {
			damage: damageData,
			/** @type FormSelectOption[] **/
			types: [],
			/** @type DamageType **/
			selectedType: damageData.type,
		};

		function updateOptions() {
			/** @type Set<DamageType> **/
			let choices = new Set([context.damage.type]);
			for (const modifier of context.damage.allModifiers) {
				if (!modifier.enabled) {
					continue;
				}
				if (modifier.types) {
					modifier.types.forEach((type) => {
						choices.add(type);
					});
				}
			}
			context.types = FoundryUtils.generateConfigIconOptions(choices, FU.damageTypes, FU.affIcon);
			context.types.forEach((option) => {
				option.selected = option.value === context.selectedType;
			});
		}

		updateOptions();

		const result = await foundry.applications.api.DialogV2.input({
			window: {
				title: game.i18n.localize('FU.DamageCustomizer'),
			},
			position: {
				width: 440,
			},
			actions: {
				/** @param {Event} event
				 *  @param {HTMLElement} dialog **/
				selectType: (event, dialog) => {
					const value = event.target.dataset.value;
					const parent = dialog.closest('div');
					const option = parent.querySelector("input[name='damageType']");
					option.value = value;
					parent.querySelectorAll('button').forEach((button) => {
						button.classList.remove('selected');
					});
					dialog.classList.add('selected');
					context.selectedType = value;
				},
			},
			classes: ['projectfu', 'backgroundstyle', 'fu-dialog'],
			content: await FoundryUtils.renderTemplate('dialog/dialog-damage-customizer-v2', {
				FU,
				context: context,
			}),
			rejectClose: false,
			ok: {
				icon: "<i class='fas fa-check'></i>",
				label: 'FU.Confirm',
			},
			/** @param {Event} event
			 *  @param {HTMLElement} dialog **/
			render: (event, dialog) => {
				// Cache selectors
				const damageTypeInput = dialog.element.querySelector("input[name='damageType']");
				const buttons = damageTypeInput.querySelectorAll('.fu-dialog__icon-option');
				for (const button of buttons) {
					button.classList.toggle('selected', button.dataset.value === context.selectedType);
				}

				// Function to update total damage and icons based on HR Zero status, and extra damage
				const totalDamageSpan = dialog.element.querySelector('#total-damage');
				function updateTotalDamage() {
					let sumString = `${context.damage.hr}`;
					context.damage.modifiers.forEach((modifier) => {
						if (modifier.amount > 0) {
							sumString += ` + ${modifier.amount} (${StringUtils.localize(modifier.label)})`;
						}
					});
					totalDamageSpan.textContent = sumString;
				}
				updateTotalDamage();
			},
		});

		if (result) {
			damageData.type = context.selectedType;
		}
	}

	/**
	 * @param {DamageData} damageData
	 * @remarks Will modify the given damage data.
	 */
	static async open(damageData) {
		const window = new DamageCustomizerV2();
		return window.#open(damageData);
	}
}
