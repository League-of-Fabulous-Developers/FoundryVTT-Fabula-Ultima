import { FU } from './config.mjs';

export class ItemCustomizer extends FormApplication {
	constructor(actor, item = null, itemType = null, options = {}) {
		super(options);
		this.actor = actor;

		this.item = item || (itemType && actor.items.find((i) => i.type === itemType)) || null;

		this.baseWeaponDetails = this.getItemDetails(this.item);
		this.currentWeaponDetails = this.baseWeaponDetails;
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: 'item-customizer',
			title: game.i18n.localize('FU.ItemCustomizer'),
			template: 'systems/projectfu/templates/app/item-customizer.hbs',
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			width: 440,
			closeOnSubmit: false,
		});
	}

	getData() {
		const weaponOptions = this.generateWeaponOptions(this.actor, this.item._id);
		const damageTypeOptions = this.generateSelectOptions(FU.damageTypes);
		const weaponTypeOptions = this.generateSelectOptions(FU.weaponTypes);
		const defenseTypeOptions = this.generateSelectOptions(FU.defenses, true);

		return {
			actor: this.actor,
			item: this.item,
			weaponOptions,
			damageTypeOptions,
			weaponTypeOptions,
			defenseTypeOptions,
			baseWeaponDetails: this.baseWeaponDetails,
			currentWeaponDetails: this.currentWeaponDetails,
		};
	}

	activateListeners(html) {
		super.activateListeners(html);

		// Change listener for form updates
		html.find('#weapon-item').change((ev) => this.updateWeaponDetails(html));
		html.find('input,select').change((ev) => this.updateWeaponDetails(html));

		// Button listeners
		html.find('.modify-button').click(() => this._onModify(html));
		html.find('.clone-button').click(() => this._onClone(html));
		html.find('.temp-roll-button').click(() => this._onTempRoll(html));
		html.find('.cancel-button').click(() => this.close());
		html.find('.reset-button').click(() => this.resetWeaponDetails(html));
	}

	async _updateObject(event, formData) {
		return this._onModify(null, formData);
	}

	async _onModify(html) {
		const { selectedWeapon, hrZeroBool, ...formData } = this.extractFormValues(html);
		await selectedWeapon.update({
			'system.accuracy.value': selectedWeapon.system.accuracy.value + formData.accuracyMod,
			'system.damage.value': selectedWeapon.system.damage.value + formData.damageMod,
			'system.damageType.value': formData.damageType,
			'system.type.value': formData.weaponType,
			'system.defense': formData.defenseType,
			'system.rollInfo.useWeapon.hrZero.value': hrZeroBool,
		});
		ui.notifications.info(`${selectedWeapon.name} modified for ${this.actor.name}`);
		this.close();
	}

	async _onClone(html) {
		const { selectedWeapon, hrZeroBool, ...formData } = this.extractFormValues(html);
		const newItemData = foundry.utils.deepClone(selectedWeapon);
		const newItemName = `${newItemData.name} (Modified)`;

		const newItem = await Item.create(newItemData, { parent: this.actor });
		await newItem.update({
			'system.accuracy.value': newItem.system.accuracy.value + formData.accuracyMod,
			'system.damage.value': newItem.system.damage.value + formData.damageMod,
			'system.damageType.value': formData.damageType,
			'system.defense': formData.defenseType,
			'system.type.value': formData.weaponType,
			'system.rollInfo.useWeapon.hrZero.value': hrZeroBool,
			name: newItemName,
		});
		ui.notifications.info(`${newItem.name} cloned and added to ${this.actor.name}`);
		this.close();
	}

	async _onTempRoll(html) {
		const { selectedWeapon, hrZeroBool, ...formData } = this.extractFormValues(html);

		const originalValues = {
			accuracy: selectedWeapon.system.accuracy.value,
			damage: selectedWeapon.system.damage.value,
			damageType: selectedWeapon.system.damageType.value,
			weaponType: selectedWeapon.system.type.value,
			defenseType: selectedWeapon.system.defense,
		};

		await selectedWeapon.update({
			'system.accuracy.value': originalValues.accuracy + formData.accuracyMod,
			'system.damage.value': originalValues.damage + formData.damageMod,
			'system.damageType.value': formData.damageType || originalValues.damageType,
			'system.type.value': formData.weaponType || originalValues.weaponType,
			'system.defense': formData.defenseType || originalValues.defenseType,
		});

		await selectedWeapon.roll({ shift: hrZeroBool });

		// Reset to original values after rolling
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await selectedWeapon.update(originalValues);

		this.render(true);
	}

	extractFormValues(html) {
		return {
			selectedWeapon: this.actor.items.get(html.find('#weapon-item').val()),
			damageType: html.find('#damage-type').val(),
			weaponType: html.find('#weapon-type').val(),
			defenseType: html.find('#defense-type').val(),
			accuracyMod: parseInt(html.find('#accuracy-mod').val(), 10),
			damageMod: parseInt(html.find('#damage-mod').val(), 10),
			hrZeroBool: html.find('#hrzero').prop('checked'),
		};
	}

	// Updates both the base and current weapon details when a new weapon is selected
	updateWeaponDetails(html) {
		const selectedWeaponId = html.find('#weapon-item').val();
		const selectedWeapon = this.actor.items.get(selectedWeaponId);

		// Update the base weapon details to the newly selected weapon
		this.baseWeaponDetails = this.getItemDetails(selectedWeapon);

		// Update the current weapon details based on form input and selected weapon
		this.currentWeaponDetails = this.getItemDetails(
			selectedWeapon,
			html.find('#damage-type').val(),
			html.find('#weapon-type').val(),
			html.find('#defense-type').val(),
			parseInt(html.find('#accuracy-mod').val(), 10),
			parseInt(html.find('#damage-mod').val(), 10),
			html.find('#hrzero').prop('checked'),
		);

		// Update the HTML to reflect the new weapon details
		html.find('#base-item').html(this.baseWeaponDetails);
		html.find('#current-item').html(this.currentWeaponDetails);
	}

	// Reset current weapon details to base weapon details
	resetWeaponDetails(html) {
		const selectedWeaponId = html.find('#weapon-item').val();
		const selectedWeapon = this.actor.items.get(selectedWeaponId);

		// Reset form fields to the base weapon's values
		html.find('#damage-type').val(selectedWeapon.system.damageType.value);
		html.find('#weapon-type').val(selectedWeapon.system.type.value);
		html.find('#defense-type').val(selectedWeapon.system.defense), html.find('#accuracy-mod').val(0);
		html.find('#damage-mod').val(0);
		html.find('#hrzero').prop('checked', false);

		// Reflect the reset in the currentWeaponDetails
		this.updateWeaponDetails(html);
	}

	generateSelectOptions(options, nested = false) {
		return Object.entries(options)
			.map(([value, label]) => {
				if (nested) {
					return `<option value="${value}">${game.i18n.localize(label.name)}</option>`;
				} else {
					return `<option value="${value}">${game.i18n.localize(label)}</option>`;
				}
			})
			.join('');
	}

	generateWeaponOptions(actor, initialWeaponId) {
		return actor.items
			.filter((item) => item.type === 'weapon' || item.type === 'basic')
			.map((item) => `<option value="${item.id}" ${item.id === initialWeaponId ? 'selected' : ''}>${item.name}</option>`)
			.join('');
	}

	capFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	// This function generates the weapon details, that displays base and current
	getItemDetails(item, damageType, weaponType, defenseType, accuracyMod = 0, damageMod = 0, hrZeroBool = false) {
		const die1 = item.system.attributes.primary.value;
		const die2 = item.system.attributes.secondary.value;
		const accMod = item.system.accuracy.value + accuracyMod;
		const dmgMod = item.system.damage.value + damageMod;
		const dmgType = this.capFirstLetter(damageType || item.system.damageType.value);
		const weapType = this.capFirstLetter(weaponType || item.system.type.value);
		const defType = this.capFirstLetter(defenseType || item.system.defense);
		const hrZeroLabel = hrZeroBool ? `HR0` : `HR`;

		return `
            <div class="flexcol dialog-name">
                <div class="flexrow">
                    <div class="dialog-image">
                        <img src="${item.img}" data-tooltip="${item.name}" />
                    </div>
                    <label class="resource-content resource-label">
                        ${item.name}
                        <strong>【${(die1 + ' + ' + die2).toUpperCase()}】 +${accMod}</strong>
                        <strong> ⬥ </strong>
                        <strong>【${hrZeroLabel} + ${dmgMod}】</strong> ${dmgType}
                    </label>
                </div>
                <div>
                    <strong>${weapType}</strong>
                    <strong>${game.i18n.localize('FU.Versus')}</strong>
                    <strong>${defType}</strong>
                </div>
            </div>`;
	}
}
