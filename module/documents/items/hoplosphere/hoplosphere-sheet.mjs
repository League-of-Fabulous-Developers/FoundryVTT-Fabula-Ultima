import { editImageFile } from '../../../helpers/image-file-picker.mjs';
import { HoplosphereDataModel } from './hoplosphere-data-model.mjs';
import { PseudoDocument } from '../../pseudo/pseudo-document.mjs';

export class HoplosphereSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			addEffect: HoplosphereSheet.#addEffect,
			removeEffect: HoplosphereSheet.#removeEffect,
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
		classes: ['projectfu', 'sheet', 'item', 'backgroundstyle', 'hoplosphere-sheet'],
		position: {
			width: 700,
		},
	};

	static PARTS = {
		header: {
			template: 'systems/projectfu/templates/item/parts/item-header.hbs',
		},
		system: {
			template: 'systems/projectfu/templates/item/hoplosphere/hoplosphere-system.hbs',
		},
		main: {
			template: 'systems/projectfu/templates/item/hoplosphere/hoplosphere-main.hbs',
		},
	};

	static _migrateConstructorParams(first, rest) {
		if (first?.document instanceof PseudoDocument) {
			return first;
		}
		return super._migrateConstructorParams(first, rest);
	}

	static #printDebug() {
		console.log(this);
	}

	static async #addEffect(event, element) {
		if (!this.isEditable) return;
		await this.item.system.addEffect();
	}

	static async #removeEffect(event, element) {
		const effects = this.item.system.toObject(true).effects;
		effects.splice(element.dataset.index, 1);
		await this.item.update({ 'system.effects': effects });
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
			effectOptions: Object.fromEntries(HoplosphereDataModel.availableChangeTypes.map((changeType) => [changeType.type, changeType.label])),
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
