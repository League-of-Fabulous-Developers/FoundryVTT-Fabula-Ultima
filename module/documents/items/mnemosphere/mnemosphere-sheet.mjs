import { PseudoItem } from '../pseudo-item.mjs';
import { TextEditor } from '../../../helpers/text-editor.mjs';
import { FUItemSheet } from '../../../sheets/item-sheet.mjs';
import { MnemosphereSkillsTableRenderer } from '../../../helpers/tables/mnemosphere-skills-table-renderer.mjs';
import { MnemosphereHeroicsTableRenderer } from '../../../helpers/tables/mnemosphere-heroics-table-renderer.mjs';
import { OtherItemsTableRenderer } from '../../../helpers/tables/other-items-table-renderer.mjs';
import { MnemosphereSpellsTableRenderer } from '../../../helpers/tables/mnemosphere-spells-table-renderer.mjs';
import { MnemosphereClassFeatureTables } from '../../../helpers/tables/mnemosphere-class-feature-tables-renderer.mjs';
import { FU } from '../../../helpers/config.mjs';

export class MnemosphereSheet extends FUItemSheet {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			createItem: MnemosphereSheet.#createItem,
			debug: MnemosphereSheet.#printDebug,
			toggleSheetLock: MnemosphereSheet.#toggleSheetLock,
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
		classes: ['projectfu', 'sheet', 'item', 'backgroundstyle', 'mnemosphere-sheet'],
		position: {
			width: 700,
		},
	};

	static PARTS = {
		header: FUItemSheet.PARTS.header,
		tabs: FUItemSheet.PARTS.tabs,
		skills: {
			template: 'systems/projectfu/templates/item/mnemosphere/mnemosphere-skills.hbs',
		},
		other: {
			template: 'systems/projectfu/templates/item/mnemosphere/mnemosphere-other.hbs',
		},
	};

	static TABS = {
		primary: {
			tabs: [
				{
					id: 'skills',
					label: 'FU.Skills',
				},
				{
					id: 'other',
					label: 'FU.Other',
				},
			],
			initial: 'skills',
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
	static async #createItem(event, element) {
		if (!this.isEditable) {
			ui.notifications.warn('FU.MnemosphereSheetLocked', { localize: true });
			return;
		}

		/** @type MnemosphereDataModel */
		const system = this.item.system;
		const itemData = { type: element.dataset.type, name: PseudoItem.defaultName({ type: element.dataset.type }) };

		if (itemData.type === 'classFeature') {
			const featureType = FU.classFeatureRegistry.byKey(element.dataset.subType);
			if (featureType) {
				itemData.name = game.i18n.localize(featureType.translation);
				itemData.system = {
					featureType: element.dataset.subType,
				};
			}
		}

		const [doc] = await system.createEmbeddedDocuments(PseudoItem.documentName, [itemData]);
		doc.sheet.render(true);
	}

	static #toggleSheetLock() {
		this.#sheetLocked = !this.#sheetLocked;
		this.render();
	}

	#sheetLocked = true;

	#skillsTable = new MnemosphereSkillsTableRenderer();
	#heroicsTable = new MnemosphereHeroicsTableRenderer();
	#spellsTable = new MnemosphereSpellsTableRenderer();
	#featuresTable = new MnemosphereClassFeatureTables();
	#otherItemsTable = new OtherItemsTableRenderer('skill', 'heroic', 'spell', 'classFeature');

	get isEditable() {
		return super.isEditable && (!this.item.isEmbedded || !this.#sheetLocked);
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		return Object.assign(context, {
			item: this.item,
			system: this.item.system,
			editable: this.isEditable,
		});
	}

	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		switch (partId) {
			case 'skills': {
				Object.assign(context, {
					mastered: this.item.system.level >= this.item.system.maxLevel,
					totalSkillLevels: this.item.system.skills.reduce((total, skill) => total + skill.system.level.value, 0),
					skillsTable: await this.#skillsTable.renderTable(this.item, { sheetLocked: !this.isEditable }),
					heroicsTable: await this.#heroicsTable.renderTable(this.item, { sheetLocked: !this.isEditable }),
				});
				break;
			}
			case 'other': {
				Object.assign(context, {
					otherCategories: [
						{ label: 'FU.Spells', table: await this.#spellsTable.renderTable(this.item, { sheetLocked: !this.isEditable }) },
						{ label: 'FU.Features', table: await this.#featuresTable.renderTable(this.item, { sheetLocked: !this.isEditable }) },
						{ label: 'FU.Other', table: await this.#otherItemsTable.renderTable(this.item, { sheetLocked: !this.isEditable }) },
					],
				});
				break;
			}
		}
		return context;
	}

	async _onDrop(event) {
		// Dropped Documents
		const data = TextEditor.implementation.getDragEventData(event);
		if (data.type === 'Item') {
			const documentClass = CONFIG.Item.documentClass;
			const item = await documentClass.fromDropData(data);

			if (this.item.uuid === item.parentDocument?.uuid) {
				return this._onSortItem(event, item);
			}

			if (['skill', 'heroic', 'spell', 'classFeature'].includes(item?.type)) {
				await this.item.system.createEmbeddedDocuments(PseudoItem.documentName, [item.toObject(true)]);
			} else {
				ui.notifications.warn(game.i18n.format('FU.MnemosphereItemTypeNotSupported', { type: item?.type }));
			}

			return;
		}

		return super._onDrop(event);
	}

	_onSortItem(event, item) {
		const items = this.item.getEmbeddedCollection(foundry.documents.Item.documentName);
		const source = items.get(item.id);

		// Confirm the drop target
		const dropTarget = event.target.closest('[data-item-id]');
		if (!dropTarget) return;
		const target = items.get(dropTarget.dataset.itemId);
		if (source.id === target.id) return;

		// Identify sibling items based on adjacent HTML elements
		const siblings = [];
		for (const element of dropTarget.parentElement.children) {
			const siblingId = element.dataset.itemId;
			if (siblingId && siblingId !== source.id) siblings.push(items.get(element.dataset.itemId));
		}

		// Perform the sort
		const sortUpdates = foundry.utils.performIntegerSort(source, { target, siblings });
		const updateData = sortUpdates.map((u) => {
			const update = u.update;
			update._id = u.target._id;
			return update;
		});

		// Perform the update
		return this.item.updateEmbeddedDocuments(foundry.documents.Item.documentName, updateData);
	}
}
