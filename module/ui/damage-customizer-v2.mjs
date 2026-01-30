import { FU, SYSTEM } from '../helpers/config.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { SETTINGS } from '../settings.js';

export class DamageCustomizerV2 {
	/**
	 * @param {DamageData} damageData
	 * @param {FUItem} item
	 * @remarks Will modify the given damage data.
	 */
	static async open(damageData, item) {
		const context = {
			item: item,
			damage: damageData,
			/** @type FormSelectOption[] **/
			types: FoundryUtils.generateConfigIconOptions(Object.keys(FU.damageTypes), FU.damageTypes, FU.affIcon),
			/** @type DamageType **/
			initialType: damageData.type,
			/** @type DamageType **/
			selectedType: damageData.type,

			// This logic may need adjusting, there do not appear to be any situations currently
			// where an item is actually passed to this version of the damage customizer
			useCategories: item?.system?.category?.value && game.settings.get(SYSTEM, SETTINGS.optionCategoryAffinities),
			categories: FoundryUtils.generateConfigIconOptions(Object.keys(FU.weaponCategories), FU.weaponCategories, FU.weaponCategoryIcons),
			selectedCategory: damageData.weaponCategory,
		};

		const result = await foundry.applications.api.DialogV2.input({
			window: {
				title: game.i18n.localize('FU.ChatApplyDamage'),
				icon: 'fas fa-heartbeat',
			},
			position: {
				width: 480,
			},
			actions: {
				/** @param {Event} event
				 *  @param {HTMLElement} dialog **/
				selectCategory: (event, dialog) => {
					const value = event.target.dataset.value;
					const parent = dialog.closest('div');
					const option = parent.querySelector("input[name='weaponCategory']");
					option.value = value;
					parent.querySelectorAll('button').forEach((button) => {
						button.classList.remove('selected');
					});
					dialog.classList.add('selected');
					context.selectedCategory = value;
				},
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
				const customDamageBonusInput = dialog.element.querySelector('#customDamage');
				const hrInput = dialog.element.querySelector('#hr');

				// Update type options accordingly
				// const typeButtons = dialog.element.querySelectorAll('.fu-dialog__icon-option');
				const typeButtons = dialog.element.querySelectorAll(`[data-group="damageType"]`);
				function updateTypeOptions() {
					/** @type Set<DamageType> **/
					let available = context.damage.getAvailableTypes();

					if (!available.has(context.selectedType)) {
						context.selectedType = context.initialType;
					}
					context.types.forEach((option) => {
						option.disabled = available.has(option.value);
						option.selected = option.value === context.selectedType;
					});

					for (const button of typeButtons) {
						const type = button.dataset.value;
						button.disabled = !available.has(type);
						button.classList.toggle('selected', type === context.selectedType);
					}
				}
				updateTypeOptions();

				// Function to update total damage and icons based on HR Zero status, and extra damage
				const totalDamageSpan = dialog.element.querySelector('#total-damage');
				function updateTotalDamage() {
					let components = [];
					// HR
					if (context.damage.hr > 0 && hrInput.checked) {
						components.push(`${context.damage.hr} (${StringUtils.localize('FU.HighRollAbbr')})`);
					}
					// Modifiers
					context.damage.modifiers.forEach((modifier) => {
						if (modifier.amount > 0) {
							components.push(`${modifier.amount} (${StringUtils.localize(modifier.label)})`);
						}
					});
					// Custom Bonus
					const customBonus = customDamageBonusInput.value;
					if (customBonus && customBonus > 0) {
						components.push(`${customBonus} (${StringUtils.localize('FU.DamageBonusCustom')})`);
					}
					totalDamageSpan.textContent = components.join(' + ');
				}
				updateTotalDamage();
				customDamageBonusInput.addEventListener('change', () => {
					updateTotalDamage();
				});
				if (hrInput instanceof HTMLElement) {
					hrInput.addEventListener('change', () => {
						updateTotalDamage();
					});
				}

				// Modifier toggles
				const modifierCheckboxes = dialog.element.querySelectorAll("input[type='checkbox'][name^='context.damage._modifiers.']");
				for (const checkbox of modifierCheckboxes) {
					checkbox.addEventListener('change', (ev) => {
						const dataset = ev.target.dataset;
						const enabled = ev.target.checked;
						console.debug(`Changed ${dataset.index}`);
						context.damage.rawModifiers[dataset.index].enabled = enabled;
						updateTypeOptions();
						updateTotalDamage();
					});
				}
			},
		});
		if (result) {
			console.log('Result:', result);
			// const expanded = foundry.utils.expandObject(result);
			damageData.type = context.selectedType;
			damageData.category = context.selectedCategory;
			if (result.hr === false) {
				damageData.hrZero = true;
				damageData.hr = 0;
			}
			// Custom damage
			if (result.customDamageBonus) {
				const bonus = Number.parseInt(result.customDamageBonus);
				if (bonus > 0) {
					damageData.addModifier('FU.DamageBonusCustom', bonus);
				}
			}
		} else {
			throw Error('Canceled by user');
		}
	}
}
