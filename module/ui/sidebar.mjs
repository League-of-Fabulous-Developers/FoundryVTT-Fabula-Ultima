import { GameWellspringManager } from '../documents/items/classFeature/invoker/game-wellspring-manager.mjs';
import { systemTemplatePath } from '../helpers/system-utils.mjs';
import { FUHooks } from '../hooks.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { CompendiumBrowser } from './compendium/compendium-browser.mjs';
import { MetaCurrencyTrackerApplication } from './metacurrency/MetaCurrencyTrackerApplication.mjs';

const { api, sidebar } = foundry.applications;

/**
 * @typedef {Function} SidebarToolCondition
 * @returns {boolean}
 */

/**
 * @typedef SidebarTool
 * @property {string} label
 * @property {string} [icon]
 * @property {Function} click
 * @property {string[]} [classes]
 * @property {SidebarToolCondition} [condition]
 */

/**
 * @typedef SidebarToolGroup
 * @property {string} id
 * @property {string} label
 * @property {string[]} [classes]
 * @property {Record<string, SidebarTool>} tools
 */

export class FUSidebarApplication extends api.HandlebarsApplicationMixin(sidebar.AbstractSidebarTab) {
	static DEFAULT_OPTIONS = {
		classes: ['directory', 'projectfu'],
		window: {
			title: 'SIDEBAR.TabSettings',
		},
		actions: {
			clickToolButton: FUSidebarApplication.clickToolButton,
		},
	};

	static PARTS = {
		main: {
			template: systemTemplatePath(`ui/sidebar-menu`),
			root: true,
		},
	};

	static tabName = 'pfuTools';

	static clickToolButton(event, button) {
		const groupId = button.dataset.group;
		const toolId = button.dataset.tool;

		const tools = this._prepareTools();
		const group = tools.find((group) => group.id === groupId);
		if (!group) throw new Error(`Group ${groupId} not found.`);
		const tool = group.tools[toolId];
		if (!tool) throw new Error(`Tool ${toolId} not found.`);

		if (typeof tool.click === 'function') tool.click.call(undefined);
	}

	onOpenPartySheet() {
		FUPartySheet.toggleActive();
	}
	onOpenMetaCurrencyTracker() {
		new MetaCurrencyTrackerApplication().render({ force: true });
	}
	onOpenWellspringManager() {
		new GameWellspringManager().render({ force: true });
	}
	onOpenCompendiumBrowser() {
		CompendiumBrowser.instance.render({ force: true });
	}

	/** @type SidebarToolGroup  */
	#tools = [
		{
			id: 'utilities',
			label: 'FU.Utilities',
			tools: {},
		},
	];

	_prepareTools() {
		const tools = foundry.utils.deepClone(this.#tools);
		for (const group of Object.values(tools)) {
			if (group.classes?.length) group.expandedClasses = group.classes.join(' ');
			for (const tool of Object.values(group.tools)) {
				switch (typeof tool.condition) {
					case 'function':
						tool.visible = tool.condition();
						break;
					case 'boolean':
						tool.visible = tool.condition;
						break;
					default:
						tool.visible = true;
				}
				if (tool.visible) group.visible = true;
				if (tool.classes?.length) tool.expandedClasses = tool.classes.join(' ');
			}
		}
		return tools;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.tools = this._prepareTools();

		return context;
	}

	constructor(options) {
		super(options);
		const tools = this.#tools;
		Hooks.callAll(FUHooks.GET_SIDEBAR_TOOLS, tools);
		this.#tools = tools;
	}
}
