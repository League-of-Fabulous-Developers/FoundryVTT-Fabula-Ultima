import { HoplosphereDataModel } from './hoplosphere-data-model.mjs';
import { FUItemSheet } from '../../../sheets/item-sheet.mjs';

export class HoplosphereSheet extends FUItemSheet {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			addEffect: HoplosphereSheet.#addEffect,
			removeEffect: HoplosphereSheet.#removeEffect,
			debug: HoplosphereSheet.#printDebug,
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
		header: FUItemSheet.PARTS.header,
		system: {
			template: 'systems/projectfu/templates/item/hoplosphere/hoplosphere-system.hbs',
		},
		main: {
			template: 'systems/projectfu/templates/item/hoplosphere/hoplosphere-main.hbs',
			scrollable: '',
		},
	};

	static #printDebug() {
		console.log(this);
	}

	static async #addEffect(event, element) {
		if (!this.isEditable) return;
		await this.item.system.addEffect();
	}

	static async #removeEffect(event, element) {
		if (!this.isEditable) return;
		await this.item.system.removeEffect(element.dataset.index);
		('FU.HoplosphereIdLine1');
	}

	static #toggleSheetLock() {
		this.#sheetUnlocked = !this.#sheetUnlocked;
		this.render();
	}

	#sheetUnlocked = false;

	get isEditable() {
		return super.isEditable && (!this.item.isEmbedded || this.#sheetUnlocked);
	}

	createActiveEffect(name) {
		return ActiveEffect.create({ name: name || this.item.name, img: this.item.img, origin: this.item.uuid }, { parent: this.item });
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		Object.assign(context, {
			item: this.item,
			system: this.item.system,
			socketableOptions: {
				all: 'FU.HoplosphereSocketableOptionAll',
				weapon: 'FU.HoplosphereSocketableOptionWeapons',
			},
			requiredSlotsOptions: {
				1: 1,
				2: 2,
			},
			editable: this.isEditable,
			effectOptions: Object.fromEntries(HoplosphereDataModel.availableChangeTypes.map((changeType) => [changeType.type, changeType.label])),
		});
		return context;
	}

	_prepareSubmitData(...args) {
		console.log(...args);
		const result = super._prepareSubmitData(...args);
		console.log(result);
		return result;
	}
}
