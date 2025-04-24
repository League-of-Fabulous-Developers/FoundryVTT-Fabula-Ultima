import { editImageFile } from '../../../helpers/image-file-picker.mjs';

export class HoplosphereSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			editEffect: HoplosphereSheet.#editEffect,
			addCoagulation: HoplosphereSheet.#addCoagulation,
			removeCoagulation: HoplosphereSheet.#removeCoagulation,
			debug: HoplosphereSheet.#printDebug,
			editImage: HoplosphereSheet.#onEditImage,
			toggleSheetLock: HoplosphereSheet.#toggleSheetLock,
		},
		window: {
			controls: [
				{
					icon: 'far fa-bug',
					label: 'Print debug info',
					action: 'debug',
				},
				{
					icon: 'far fa-lock',
					label: 'Toggle sheet lock',
					action: 'toggleSheetLock',
					ownership: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
					condition: (sheet) => sheet.item.isEmbedded,
				},
			],
		},
		form: {
			submitOnChange: true,
		},
		classes: ['hoplosphere-sheet'],
		position: {
			width: 700,
		},
	};

	static PARTS = {
		header: {
			template: 'systems/projectfu/templates/item/hoplosphere/hoplosphere-header.hbs',
		},
		system: {
			template: 'systems/projectfu/templates/item/hoplosphere/hoplosphere-system.hbs',
		},
		main: {
			template: 'systems/projectfu/templates/item/hoplosphere/hoplosphere-main.hbs',
		},
	};

	static #printDebug() {
		console.log(this);
	}

	/**
	 * @param {PointerEvent} event
	 * @param {HTMLElement} element
	 * @returns {Promise<void>}
	 */
	static async #editEffect(event, element) {
		const effectSlot = element.dataset.effect;
		let effect;
		if (effectSlot === 'weapon') {
			effect = this.item.system.weaponEffect;
			if (!effect) {
				effect = await this.createActiveEffect();
				await this.item.update({ 'system.weaponEffect': effect.id });
			}
		} else if (effectSlot === 'armor') {
			effect = this.item.system.armorEffect;
			if (!effect) {
				effect = await this.createActiveEffect();
				await this.item.update({ 'system.armorEffect': effect.id });
			}
		} else if (effectSlot === 'coagulation') {
			const index = element.dataset.index;
			effect = this.item.system.coagulationEffects[index].effect;
			if (!effect) {
				effect = await this.createActiveEffect(this.item.name + ' [PH] Coagulation');
				const updateData = this.item.system.toObject(true).coagulationEffects;
				updateData[index].effect = effect.id;
				await this.item.update({ 'system.coagulationEffects': updateData });
			}
		}
		effect.sheet.render(true, { editable: !this.item.isEmbedded || this.#sheetUnlocked });
	}

	static async #addCoagulation(event, element) {
		if (!this.#sheetUnlocked) return;
		const coagulationEffects = this.item.system.toObject(true).coagulationEffects;
		coagulationEffects.push({});
		await this.item.update({ 'system.coagulationEffects': coagulationEffects });
	}

	static async #removeCoagulation(event, element) {
		const coagulationEffects = this.item.system.toObject(true).coagulationEffects;
		const [spliced] = coagulationEffects.splice(element.dataset.index, 1);
		this.item.effects.get(spliced.effect).delete();
		await this.item.update({ 'system.coagulationEffects': coagulationEffects });
	}

	static async #onEditImage(_event, target) {
		await editImageFile(this, target);
	}

	static #toggleSheetLock() {
		this.#sheetUnlocked = !this.#sheetUnlocked;
		this.render();
	}

	#sheetUnlocked = false;

	get isEditable() {
		console.log(super.isEditable, !this.item.isEmbedded, this.#sheetUnlocked, super.isEditable && (!this.item.isEmbedded || this.#sheetUnlocked));
		return super.isEditable && (!this.item.isEmbedded || this.#sheetUnlocked);
	}

	get content() {
		return this.hasFrame ? this.element.querySelector('.window-content') : this.element;
	}

	createActiveEffect(name) {
		return ActiveEffect.create({ name: name || this.item.name, img: this.item.img, origin: this.item.uuid }, { parent: this.item });
	}

	_prepareContext(options) {
		return {
			item: this.item,
			system: this.item.system,
			socketableOptions: {
				all: '[PH] All',
				weapon: '[PH] Weapons',
			},
			requiredSlotsOptions: {
				1: 1,
				2: 2,
			},
			editable: this.isEditable,
		};
	}

	_prepareSubmitData(...args) {
		console.log(...args);
		const result = super._prepareSubmitData(...args);
		console.log(result);
		return result;
	}

	/**
	 * Configure the array of header control menu options
	 * @returns {ApplicationHeaderControlsEntry[]}
	 * @protected
	 */
	_getHeaderControls() {
		return super._getHeaderControls().filter((control) => (control.condition ? control.condition(this) : true));
	}

	_onRender(context, options) {
		if (!this.isEditable) {
			this.#disableFields();
		}
	}

	/**
	 * If the sheet is not editable, disable its input fields
	 */
	#disableFields() {
		const inputs = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];
		for (let i of inputs) {
			for (let el of this.content.getElementsByTagName(i)) {
				if (i === 'TEXTAREA') el.readOnly = true;
				else el.disabled = true;
			}
		}
	}
}
