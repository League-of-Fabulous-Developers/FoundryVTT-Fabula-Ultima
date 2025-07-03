import { FU } from './config.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckHooks } from '../checks/check-hooks.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';

// Configuration for item types and their templates
const ITEM_TYPE_CONFIG = {
	weapon: { template: 'systems/projectfu/templates/app/partials/customizer-weapon.hbs' },
	basic: { template: 'systems/projectfu/templates/app/partials/customizer-weapon.hbs' },
	spell: { template: 'systems/projectfu/templates/app/partials/customizer-spell.hbs' },
	classFeature: {
		usesSubtype: true,
		subtypeKey: 'featureType',
	},
};

// Configuration for item subtypes and their templates
const ITEM_SUBTYPE_CONFIG = {
	'projectfu.weaponModule': { template: 'systems/projectfu/templates/app/partials/customizer-weapon-module.hbs' },
};

export class ItemCustomizer extends foundry.appv1.api.FormApplication {
	constructor(actor, item = null, itemType = null, options = {}) {
		super(options);
		this.actor = actor;
		this.item = item || this.findItemByType(actor, itemType);
		this.itemTypeConfig = ITEM_TYPE_CONFIG[this.item?.type] || {};
		this.options.template = this.resolveTemplate(this.item) || 'systems/projectfu/templates/app/item-customizer.hbs';
		this.baseItemDetails = this.item ? this.getItemDetails(this.item) : null;
		this.currentItemDetails = this.baseItemDetails;
	}

	// Template resolution based on item type and optional subtype
	resolveTemplate(item) {
		const typeConfig = ITEM_TYPE_CONFIG[item?.type];
		if (!typeConfig) return null;

		if (typeConfig.usesSubtype) {
			const subtypeValue = item?.system?.[typeConfig.subtypeKey];
			return ITEM_SUBTYPE_CONFIG[subtypeValue]?.template || null;
		}

		return typeConfig.template || null;
	}

	// Find item by type, and optionally by a specific subtype
	findItemByType(actor, itemType, subtypeKey = null, subtypeValue = null) {
		if (!itemType) return null;

		return actor.items.find((item) => {
			const typeMatch = item.type === itemType;
			const subtypeMatch = subtypeKey && subtypeValue ? item.system?.[subtypeKey] === subtypeValue : true;
			return typeMatch && subtypeMatch;
		});
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: 'item-customizer',
			title: game.i18n.localize('FU.ItemCustomizer'),
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			width: 440,
			closeOnSubmit: false,
		});
	}

	getData() {
		const subtypeKey = this.itemTypeConfig.subtypeKey || null;
		const subtypeValue = subtypeKey ? this.item?.system?.[subtypeKey] : null;
		return {
			actor: this.actor,
			item: this.item,
			itemOptions: this.generateItemOptions(this.actor, this.item?._id, ['weapon', 'basic']),
			spellOptions: this.generateItemOptions(this.actor, this.item?._id, ['spell']),
			classFeatureOptions: this.generateItemOptions(this.actor, this.item?._id, ['classFeature'], subtypeKey, subtypeValue),
			damageTypeOptions: this.generateSelectOptions(FU.damageTypes),
			weaponTypeOptions: this.generateSelectOptions(FU.weaponTypes),
			defenseTypeOptions: this.generateSelectOptions(FU.defenses, true),
			primaryOptions: this.generateSelectOptions(FU.attributeAbbreviations),
			secondaryOptions: this.generateSelectOptions(FU.attributeAbbreviations),
			baseItemDetails: this.baseItemDetails,
			currentItemDetails: this.currentItemDetails,
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
		const updateListener = (selector, callback) => html.find(selector).change((ev) => callback(html));

		// Change listener for form updates
		updateListener('#item-selector', this.updateItemDetails.bind(this));
		updateListener('input,select', this.updateItemDetails.bind(this));

		// Button listeners
		html.find('.modify-button').click(() => this._onModify(html));
		html.find('.clone-button').click(() => this._onClone(html));
		html.find('.temp-roll-button').click(() => this._onTempRoll(html));
		html.find('.cancel-button').click(() => this.close());

		// Reset buttons by item type
		html.find('.reset-weapon-button').click(() => this.resetItemDetails(html, 'weapon'));
		html.find('.reset-spell-button').click(() => this.resetItemDetails(html, 'spell'));
		html.find('.reset-weapon-module-button').click(() => this.resetItemDetails(html, 'classFeature', 'projectfu.weaponModule'));

		const selectedItem = this.item;
		const type = selectedItem?.type;
		const subtype = selectedItem?.system?.featureType;

		switch (type) {
			case 'spell':
				this.resetSpellDetails(html);
				break;
			case 'weapon':
			case 'basic':
				this.resetWeaponDetails(html);
				break;
			case 'classFeature':
				if (subtype === 'projectfu.weaponModule') {
					this.resetWeaponModuleDetails(html);
				}
				break;
		}
	}

	async _updateObject(event, formData) {
		return this._onModify(null, formData);
	}

	async _onModify(html) {
		const { selectedItem, hrZeroBool, ...formData } = this.extractFormValues(html);
		if (!selectedItem) return;

		const itemType = selectedItem.type;
		const subtype = selectedItem.system?.featureType ?? null;

		await this.updateItem(selectedItem, formData, itemType, hrZeroBool, selectedItem.name, subtype);

		ui.notifications.info(`${selectedItem.name} modified for ${this.actor.name}`);
		this.close();
	}

	async _onClone(html) {
		const { selectedItem, hrZeroBool, ...formData } = this.extractFormValues(html);
		if (!selectedItem) return;

		const newItemData = foundry.utils.deepClone(selectedItem);
		const newItemName = `${newItemData.name} (Modified)`;
		const newItem = await Item.create(newItemData, { parent: this.actor });

		const itemType = selectedItem.type;
		const subtype = selectedItem.system?.featureType ?? null;

		await this.updateItem(newItem, formData, itemType, hrZeroBool, newItemName, subtype);

		ui.notifications.info(`${newItem.name} cloned and added to ${this.actor.name}`);
		this.close();
	}

	async updateItem(item, formData, itemType, hrZeroBool, name = item.name) {
		console.log(`Updating item: ${name}, Type: ${itemType}`);

		const isWeaponModule = itemType === 'classFeature' && item.system?.featureType === 'projectfu.weaponModule';

		const updateConfig = {
			spell: {
				fields: {
					'system.rollInfo.attributes.primary.value': formData.primary,
					'system.rollInfo.attributes.secondary.value': formData.secondary,
					'system.rollInfo.accuracy.value': (item.system.rollInfo?.accuracy?.value || 0) + formData.accuracyMod,
					'system.rollInfo.damage.value': (item.system.rollInfo?.damage?.value || 0) + formData.damageMod,
					'system.rollInfo.damage.type.value': formData.damageType,
					'system.rollInfo.useWeapon.hrZero.value': hrZeroBool,
				},
			},
			weapon: {
				fields: {
					'system.attributes.primary.value': formData.primary,
					'system.attributes.secondary.value': formData.secondary,
					'system.accuracy.value': (item.system.accuracy?.value || 0) + formData.accuracyMod,
					'system.damage.value': (item.system.damage?.value || 0) + formData.damageMod,
					'system.damageType.value': formData.damageType,
					'system.type.value': formData.weaponType,
					'system.defense': formData.defenseType,
					'system.rollInfo.useWeapon.hrZero.value': hrZeroBool,
				},
			},
			classFeature: isWeaponModule
				? {
						fields: {
							'system.data.accuracy.attr1': formData.primary,
							'system.data.accuracy.attr2': formData.secondary,
							'system.data.accuracy.modifier': (item.system.data.accuracy?.modifier || 0) + formData.accuracyMod,
							'system.data.damage.bonus': (item.system.data.damage?.bonus || 0) + formData.damageMod,
							'system.data.damage.type': formData.damageType,
							'system.data.type': formData.weaponType,
							'system.data.accuracy.defense': formData.defenseType,
						},
					}
				: {},
		};

		const updateData = updateConfig[itemType]?.fields || {};

		if (Object.keys(updateData).length === 0) {
			console.warn(`No update config for item type: ${itemType}, subtype: ${item.system?.featureType}`);
			return;
		}

		await item.update({ ...updateData, name });
	}

	async _onTempRoll(html) {
		const { selectedItem, hrZeroBool, ...formData } = this.extractFormValues(html);
		const modifiedItem = foundry.utils.deepClone(selectedItem);
		const typeValue = formData.weaponType;

		const isWeapon = ['weapon', 'basic'].includes(selectedItem.type);
		const isWeaponModule = selectedItem.type === 'classFeature' && selectedItem.system?.featureType === 'projectfu.weaponModule';

		if (isWeapon) await modifiedItem.update({ 'system.type.value': typeValue });
		if (isWeaponModule) await modifiedItem.update({ 'system.data.type': typeValue });

		this.setupCheckHooks(formData, modifiedItem, selectedItem);
		return await ChecksV2.accuracyCheck(this.actor, modifiedItem, CheckConfiguration.initHrZero(hrZeroBool));
	}

	setupCheckHooks(formData, modifiedItem, selectedItem) {
		Hooks.once(CheckHooks.prepareCheck, (check) => {
			Object.assign(check, {
				primary: formData.primary,
				secondary: formData.secondary,
				modifiers: [
					{
						value: formData.accuracyMod,
						label: 'FU.CheckSituationalModifier',
					},
				],
			});

			const config = CheckConfiguration.configure(check);
			let itemValue;

			switch (selectedItem.type) {
				case 'weapon':
				case 'basic':
					itemValue = selectedItem.system.damage.value;
					break;
				case 'spell':
					itemValue = selectedItem.system.rollInfo.damage.value;
					break;
				case 'classFeature':
					if (selectedItem.system?.featureType === 'projectfu.weaponModule') {
						itemValue = selectedItem.system.data.damage.bonus;
						break;
					}
					console.warn(`Unsupported classFeature subtype: ${selectedItem.system?.featureType}`);
					return;
				default:
					console.warn(`Unsupported item type: ${selectedItem.type}`);
					return;
			}

			config.setDamage(formData.damageType, itemValue);
			config.addDamageBonus('FU.CheckSituationalModifier', formData.damageMod);
			config.setTargetedDefense(formData.defenseType);
		});
	}

	extractFormValues(html) {
		const itemSelector = html.find('#item-selector').val();
		const primary = html.find('#primary').val();
		const secondary = html.find('#secondary').val();
		const damageType = html.find('#damage-type').val();
		const weaponType = html.find('#weapon-type').val();
		const defenseType = html.find('#defense-type').val();
		const accuracyMod = parseInt(html.find('#accuracy-mod').val(), 10);
		const damageMod = parseInt(html.find('#damage-mod').val(), 10);
		const hrZeroBool = html.find('#hrzero').prop('checked');

		return {
			actor: this.actor,
			selectedItem: this.actor.items.get(itemSelector),
			primary,
			secondary,
			damageType,
			weaponType,
			defenseType,
			accuracyMod,
			damageMod,
			hrZeroBool,
		};
	}

	// Updates both the base and current item details when a new item is selected
	updateItemDetails(html) {
		const selectedItem = this.actor.items.get(html.find('#item-selector').val());
		this.baseItemDetails = this.getItemDetails(selectedItem);

		// Update the current item details based on form input and selected item
		this.currentItemDetails = this.getItemDetails(selectedItem, ...this.getFormValues(html));
		html.find('#base-item').html(this.baseItemDetails);
		html.find('#current-item').html(this.currentItemDetails);
	}

	resetItemDetails(html, type, subtype = null) {
		switch (type) {
			case 'spell':
				this.resetSpellDetails(html);
				break;
			case 'weapon':
			case 'basic':
				this.resetWeaponDetails(html);
				break;
			case 'classFeature':
				if (subtype === 'projectfu.weaponModule') {
					this.resetWeaponModuleDetails(html);
				} else {
					console.warn(`Unsupported classFeature subtype: ${subtype}`);
				}
				break;
			default:
				console.warn(`Unsupported item type: ${type}`);
		}
	}

	// Reset current weapon details to base weapon details
	resetWeaponDetails(html) {
		const selectedItem = this.actor.items.get(html.find('#item-selector').val()) || this.actor.items.get(this.item._id);
		if (!selectedItem) return;
		// Reset form fields to the base weapon's values
		html.find('#primary').val(selectedItem.system.attributes.primary.value);
		html.find('#secondary').val(selectedItem.system.attributes.secondary.value);
		html.find('#damage-type').val(selectedItem.system.damageType.value);
		html.find('#weapon-type').val(selectedItem.system.type.value);
		html.find('#defense-type').val(selectedItem.system.defense);
		html.find('#accuracy-mod').val(0);
		html.find('#damage-mod').val(0);
		html.find('#hrzero').prop('checked', false);

		// Reflect the reset in the currentItemDetails
		this.updateItemDetails(html);
	}

	// Reset current spell details to base spell details
	resetSpellDetails(html) {
		const selectedItem = this.actor.items.get(html.find('#item-selector').val()) || this.actor.items.get(this.item._id);
		if (!selectedItem) return;
		// Reset form fields to the base spell's values
		html.find('#primary').val(selectedItem.system.rollInfo.attributes.primary.value);
		html.find('#secondary').val(selectedItem.system.rollInfo.attributes.secondary.value);
		html.find('#damage-type').val(selectedItem.system.rollInfo.damage.type.value);
		html.find('#accuracy-mod').val(0);
		html.find('#damage-mod').val(0);
		html.find('#hrzero').prop('checked', false);

		// Reflect the reset in the currentItemDetails
		this.updateItemDetails(html);
	}

	resetWeaponModuleDetails(html) {
		const selectedItem = this.actor.items.get(html.find('#item-selector').val()) || this.actor.items.get(this.item._id);
		if (!selectedItem) return;

		// Reset form fields to the base weapon module's values
		html.find('#primary').val(selectedItem.system.data.accuracy.attr1);
		html.find('#secondary').val(selectedItem.system.data.accuracy.attr2);
		html.find('#damage-type').val(selectedItem.system.data.damage.type);
		html.find('#weapon-type').val(selectedItem.system.data.type);
		html.find('#defense-type').val(selectedItem.system.data.accuracy.defense);
		html.find('#accuracy-mod').val(0);
		html.find('#damage-mod').val(0);
		html.find('#hrzero').prop('checked', false);

		// Update internal state
		this.updateItemDetails(html);
	}

	getFormValues(html) {
		return [
			html.find('#damage-type').val(),
			html.find('#weapon-type').val(),
			html.find('#defense-type').val(),
			parseInt(html.find('#accuracy-mod').val(), 10),
			parseInt(html.find('#damage-mod').val(), 10),
			html.find('#hrzero').prop('checked'),
			html.find('#primary').val(),
			html.find('#secondary').val(),
		];
	}

	generateSelectOptions(options, nested = false) {
		return Object.entries(options)
			.map(([value, label]) => `<option value="${value}">${game.i18n.localize(nested ? label.name : label)}</option>`)
			.join('');
	}

	generateItemOptions(actor, selectedItemId, itemTypes = [], subtypeKey = null, subtypeValue = null) {
		return actor.items
			.filter((item) => {
				const isTypeMatch = itemTypes.includes(item.type);
				const isSubtypeMatch = subtypeKey && subtypeValue ? item.system?.[subtypeKey] === subtypeValue : true;
				return isTypeMatch && isSubtypeMatch;
			})
			.map((item) => {
				const isSelected = item.id === selectedItemId ? 'selected' : '';
				return `<option value="${item.id}" ${isSelected}>${item.name}</option>`;
			})
			.join('');
	}

	capFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	// This function generates the item details based on type
	getItemDetails(item = this.item, damageType, weaponType, defenseType, accuracyMod = 0, damageMod = 0, hrZeroBool = false, primary, secondary) {
		const typeConfig = ITEM_TYPE_CONFIG[item?.type];
		if (!typeConfig) {
			throw new Error(`Unsupported item type: ${item.type}`);
		}
		if (typeConfig.usesSubtype) {
			const subtypeValue = item?.system?.[typeConfig.subtypeKey];
			return this.handleItemWithSubtype(item, damageType, weaponType, defenseType, accuracyMod, damageMod, hrZeroBool, primary, secondary, subtypeValue);
		}

		switch (item.type) {
			case 'spell':
				return this.getSpellDetails(item, damageType, accuracyMod, damageMod, hrZeroBool, primary, secondary);
			case 'weapon':
			case 'basic':
				return this.getWeaponDetails(item, damageType, weaponType, defenseType, accuracyMod, damageMod, hrZeroBool, primary, secondary);
			default:
				throw new Error(`Unsupported item type: ${item.type}`);
		}
	}

	// Handle items with subtype (like classFeature)
	handleItemWithSubtype(item, damageType, weaponType, defenseType, accuracyMod, damageMod, hrZeroBool, primary, secondary, subtypeValue) {
		switch (item.type) {
			case 'classFeature':
				if (subtypeValue === 'projectfu.weaponModule') {
					return this.getWeaponModuleDetails(item, damageType, weaponType, defenseType, accuracyMod, damageMod, hrZeroBool, primary, secondary);
				}
		}
		throw new Error(`Unsupported item type or subtype: ${item.type}, ${subtypeValue}`);
	}

	// This function generates the weapon module details, that displays base and current
	getWeaponModuleDetails(item, damageType, weaponType, defenseType, accuracyMod = 0, damageMod = 0, hrZeroBool = false, primary, secondary) {
		const die1 = primary || item.system.data.accuracy.attr1;
		const die2 = secondary || item.system.data.accuracy.attr2;
		const accMod = item.system.data.accuracy.modifier + accuracyMod;
		const dmgMod = item.system.data.damage.bonus + damageMod;
		const dmgType = this.capFirstLetter(damageType || item.system.data.damage.type);
		const weapType = this.capFirstLetter(weaponType || item.system.data.type);
		const defType = this.capFirstLetter(defenseType || item.system.data.accuracy.defense);
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

	// This function generates the weapon details, that displays base and current
	getWeaponDetails(item, damageType, weaponType, defenseType, accuracyMod = 0, damageMod = 0, hrZeroBool = false, primary, secondary) {
		const die1 = primary || item.system.attributes.primary.value;
		const die2 = secondary || item.system.attributes.secondary.value;
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
	// This function generates the spell details, that displays base and current
	getSpellDetails(item, damageType, accuracyMod = 0, damageMod = 0, hrZeroBool = false, primary, secondary) {
		item = item || this.item;
		const die1 = primary || item.system.rollInfo.attributes.primary.value;
		const die2 = secondary || item.system.rollInfo.attributes.secondary.value;
		const accMod = item.system.rollInfo.accuracy.value + accuracyMod;
		const dmgMod = item.system.rollInfo.damage.value + damageMod;
		const dmgType = this.capFirstLetter(damageType || item.system.rollInfo.damage.type.value);
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
		</div>`;
	}
}
