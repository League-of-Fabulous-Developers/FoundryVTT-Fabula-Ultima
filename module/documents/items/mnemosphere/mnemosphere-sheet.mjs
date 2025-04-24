import { PseudoItem } from '../../pseudo/pseudo-item.mjs';
import { editImageFile } from '../../../helpers/image-file-picker.mjs';

export class MnemosphereSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			add: MnemosphereSheet.#addNested,
			edit: MnemosphereSheet.#editNested,
			delete: MnemosphereSheet.#deleteNested,
			debug: MnemosphereSheet.#printDebug,
			editImage: MnemosphereSheet.#onEditImage,
			expand: MnemosphereSheet.#onExpandItem,
			changeSkillLevel: MnemosphereSheet.#onChangeSkillLevel,
			roll: MnemosphereSheet.#onItemRoll,
		},
		window: {
			controls: [
				{
					icon: 'fa-bug',
					label: 'Print debug info',
					action: 'debug',
				},
			],
		},
		form: {
			submitOnChange: true,
		},
		classes: ['mnemosphere-sheet'],
		dragDrop: [{ dragSelector: null, dropSelector: null }],
		position: {
			width: 700,
		},
	};

	static PARTS = {
		header: {
			template: 'systems/projectfu/templates/item/mnemosphere/mnemosphere-header.hbs',
		},
		navigation: {
			template: 'systems/projectfu/templates/item/mnemosphere/mnemosphere-navigation.hbs',
		},
		skills: {
			template: 'systems/projectfu/templates/item/mnemosphere/mnemosphere-skills.hbs',
		},
		other: {
			template: 'systems/projectfu/templates/item/mnemosphere/mnemosphere-other.hbs',
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
	static async #addNested(event, element) {
		/** @type MnemosphereDataModel */
		const system = this.item.system;
		const [doc] = await system.createEmbeddedDocuments(PseudoItem.documentName, [{ type: element.dataset.type, name: PseudoItem.defaultName({ type: element.dataset.type }) }]);
		doc.sheet.render(true);
	}

	/**
	 * @param {Event} event
	 * @param {HTMLElement} element
	 */
	static #editNested(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		this.item.system.items.get(id).sheet.render({ force: true });
	}

	static #deleteNested(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		this.item.system.items.get(id).delete();
	}

	static async #onEditImage(_event, element) {
		await editImageFile(this, element);
	}

	static #onExpandItem(_event, element) {
		const itemId = element.closest('[data-item-id]').dataset.itemId;
		if (this.expandedIds.has(itemId)) {
			this.expandedIds.delete(itemId);
		} else {
			this.expandedIds.add(itemId);
		}
		this.render();
	}

	static #onChangeSkillLevel(event, element) {
		const skill = this.item.system.items.get(element.closest('[data-item-id]').dataset.itemId);
		const clickedLevel = Number(element.dataset.value);
		skill.update({ 'system.level.value': skill.system.level.value === clickedLevel ? clickedLevel - 1 : clickedLevel });
	}

	static #onItemRoll(event, element) {
		const itemId = element.closest('[data-item-id]').dataset.itemId;
		const item = this.item.system.items.get(itemId);
		if (item) {
			item.roll();
		}
	}

	expandedIds = new Set();

	tabGroups = {
		main: 'skills',
	};

	#dragDrop;

	constructor(options = {}) {
		super(options);
		this.#dragDrop = this.#createDragDropHandlers();
	}

	/**
	 * Create drag-and-drop workflow handlers for this Application
	 * @returns {DragDrop[]}     An array of DragDrop handlers
	 * @private
	 */
	#createDragDropHandlers() {
		return this.options.dragDrop.map((d) => {
			d.permissions = {};
			d.callbacks = {
				drop: this._onDrop.bind(this),
			};
			return new DragDrop(d);
		});
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		Object.entries(this.tabGroups).forEach(([group, tab]) => this.changeTab(tab, group, { force: true }));
		this.#dragDrop.forEach((d) => d.bind(this.element));
	}

	async _onDrop(event) {
		const data = TextEditor.getDragEventData(event);

		// Handle different data types
		switch (data.type) {
			case 'Item':
				this.#handleItemDrop(data);
				break;
			// write your cases
			default:
				console.log(data);
		}
	}

	async _prepareContext() {
		const descriptionPromises = this.item.system.items.map(async (item) => [item.id, await TextEditor.enrichHTML(item.system.description)]);
		const descriptions = {};
		for (const promisedDescription of descriptionPromises) {
			const [id, description] = await promisedDescription;
			descriptions[id] = description;
		}

		return {
			item: this.item,
			system: this.item.system,
			mastered: this.item.system.level >= this.item.system.maxLevel,
			totalSkillLevels: this.item.system.skills.reduce((total, skill) => total + skill.system.level.value, 0),
			expandedIds: Object.fromEntries([...this.expandedIds].map((e) => [e, true])),
			enrichedHtml: {
				description: descriptions,
			},
			otherCategories: [
				{ label: 'FU.Spells', key: 'spells' },
				{ label: 'FU.Features', key: 'classFeatures' },
				{ label: 'FU.Other', key: 'other' },
			],
		};
	}

	async #handleItemDrop(data) {
		const item = await fromUuid(data.uuid);
		if (['skill', 'heroic', 'spell', 'classFeature'].includes(item.type)) {
			await this.item.system.createEmbeddedDocuments(PseudoItem.documentName, [item.toObject(true)]);
		}
	}
}
