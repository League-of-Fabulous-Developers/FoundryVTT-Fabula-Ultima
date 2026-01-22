import FUApplication from '../application.mjs';
import { SystemControls } from '../../helpers/system-controls.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { FUTableRenderer } from '../../helpers/tables/table-renderer.mjs';
import { CommonColumns } from '../../helpers/tables/common-columns.mjs';
import { CompendiumIndex } from './compendium-index.mjs';
import { FU } from '../../helpers/config.mjs';
import { CompendiumFilter } from './compendium-filter.mjs';
import { HTMLUtils } from '../../helpers/html-utils.mjs';
import FoundryUtils from '../../helpers/foundry-utils.mjs';

/**
 * @typedef CompendiumIndexEntry
 * @property {string} _id            Document ID within the compendium
 * @property {string} uuid           Fully-qualified UUID
 * @property {string} name           Document name
 * @property {string|null} img       Image path
 * @property {string} type           Document subtype
 * @property {string} pack           Compendium collection key (e.g. "fu.items")
 * @property {Object} [system]       Partial system data (indexed fields only)
 */

/**
 * @typedef {"classes"|"skills"|"equipment"|"spells"|"adversaries"|"abilities"|"effects"} CompendiumBrowserTab
 */

class CompendiumTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		getItems: async (entries) => entries,
		tablePreset: 'item',
		sort: true,
	};
}

class BasicCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-basic-table',
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			source: CommonColumns.propertyColumn('FU.Source', 'system.source'),
		},
	};
}

class SkillsCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-skills-table',
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			sl: CommonColumns.propertyColumn('FU.SkillLevel', 'system.level.max'),
			class: CommonColumns.propertyColumn('FU.Class', 'system.class.value'),
		},
	};
}

class SpellsCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-spells-table',
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			duration: CommonColumns.propertyColumn('FU.Duration', 'system.duration.value', FU.duration),
			cost: CommonColumns.propertyColumn('FU.Cost', 'system.cost.amount'),
			class: CommonColumns.propertyColumn('FU.Class', 'system.class.value'),
		},
	};
}

class ConsumableCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-consumable-table',
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			cost: CommonColumns.propertyColumn('FU.InventoryCost', 'system.ipCost.value'),
		},
	};
}

class WeaponCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-weapon-table',
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			damage: CommonColumns.propertyColumn('FU.Damage', 'system.damage.value'),
			type: CommonColumns.propertyColumn('FU.Type', 'system.damageType.value', FU.damageTypes),
			cost: CommonColumns.propertyColumn('FU.Cost', 'system.cost.value'),
		},
	};
}

class AttackCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-attack-table',
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			damage: CommonColumns.propertyColumn('FU.Damage', 'system.damage.value'),
			type: CommonColumns.propertyColumn('FU.Type', 'system.damageType.value', FU.damageTypes),
		},
	};
}

class ArmorCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-armor-table',
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			def: CommonColumns.propertyColumn('FU.DefenseAbbr', 'system.def.value'),
			mdef: CommonColumns.propertyColumn('FU.MagicDefenseAbbr', 'system.mdef.value'),
			cost: CommonColumns.propertyColumn('FU.Cost', 'system.cost.value'),
		},
	};
}

class AdversariesCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-adversaries-table',
		tablePreset: 'actor',
		columns: {
			name: CommonColumns.actorAnchorColumn({ columnName: 'FU.Name' }),
			species: CommonColumns.propertyColumn('FU.Species', 'system.species.value', FU.species),
			role: CommonColumns.propertyColumn('FU.Role', 'system.role.value', FU.role),
			rank: CommonColumns.propertyColumn('FU.Rank', 'system.rank.value', FU.rank),
		},
	};
}

/**
 *
 */

/**
 * @desc A system-specific compendium browser with integrations throughout the system.
 */
export class CompendiumBrowser extends FUApplication {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['fu', 'fu-application'],
		window: {
			title: 'FU.CompendiumBrowser',
			icon: 'fas fa-book',
			contentClasses: ['fu-application__browser'],
			resizable: true,
		},
		form: { closeOnSubmit: false },
		position: { width: 800, height: '800' },
		actions: {},
	};

	/** @override
	 * @type Record<ApplicationTab>
	 * */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'classes', label: 'FU.Classes', icon: 'ra ra-player' },
				{ id: 'skills', label: 'FU.Skills', icon: 'ra ra-cycle' },
				{ id: 'equipment', label: 'FU.Equipment', icon: 'ra ra-anvil' },
				{ id: 'spells', label: 'FU.Spells', icon: 'ra ra-fairy-wand' },
				{ id: 'adversaries', label: 'FU.Adversaries', icon: 'ra ra-monster-skull' },
				{ id: 'abilities', label: 'FU.Abilities', icon: 'ra ra-bird-claw' },
				{ id: 'effects', label: 'FU.Effects', icon: 'ra ra-droplet-splash' },
			],
			initial: 'classes',
		},
	};

	/**
	 * @typedef CompendiumTableData
	 * @property {String} id
	 * @property {CompendiumIndexEntry[]} entries
	 * @property {String} html
	 * @property {Set<String>} visible The visible entries, by their _id property.
	 */

	/**
	 * @typedef CompendiumTabData
	 * @property {CompendiumTableData[]} tables
	 * @property {CompendiumFilterCategory[]} filters
	 */

	/**
	 * @type {CompendiumTabData}
	 */
	#tabData;

	/**
	 * @returns {CompendiumTabData}
	 */
	getTabData() {
		if (!this.#tabData) {
			return {
				tables: [],
				filters: {},
			};
		}
		return this.#tabData;
	}

	/**
	 * @override
	 */
	static PARTS = {
		// Layout
		tabs: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-tabs'),
		},
		sidebar: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-sidebar'),
		},
		// Tabs
		classes: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-classes'),
		},
		equipment: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-equipment'),
		},
		skills: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-skills'),
		},
		spells: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-spells'),
		},
		adversaries: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-adversaries'),
		},
		effects: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-effects'),
		},
		abilities: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-abilities'),
		},
	};

	/**
	 * @type {CompendiumBrowser}
	 */
	static #instance;
	/**
	 * @type {CompendiumFilter}
	 */
	#filter;

	constructor(data = {}, options = {}) {
		options.title = 'FU.CompendiumBrowser';
		super(data, options);
		this.#filter = new CompendiumFilter();
	}

	/**
	 * @returns {CompendiumBrowser}
	 */
	static get instance() {
		if (!CompendiumBrowser.#instance) {
			CompendiumBrowser.#instance = new CompendiumBrowser({}, {});
		}
		return CompendiumBrowser.#instance;
	}

	/** @inheritdoc */
	async _onClose(options) {
		this.filter.clear();
		return super._onClose(options);
	}

	/**
	 * @returns {CompendiumIndex}
	 * @remarks The index is statically cached.
	 */
	get index() {
		return CompendiumIndex.instance;
	}

	/**
	 * @returns {CompendiumFilter}
	 */
	get filter() {
		return this.#filter;
	}

	/** @inheritdoc */
	_prepareTabs(group) {
		const tabs = super._prepareTabs(group);
		if (!game.user.isGM) {
			delete tabs.adversaries;
			delete tabs.effects;
		}
		return tabs;
	}

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		// IMPORTANT: Set the active tab
		if (partId in context.tabs) context.tab = context.tabs[partId];
		const tabData = this.getTabData();
		switch (partId) {
			case 'tabs':
				context.tabs = this._prepareTabs('primary');
				break;

			case 'sidebar':
				{
					if (tabData) {
						this.filter.setCategories(tabData.filters);
					}
					context.filter = this.filter;
				}
				break;

			case 'classes':
			case 'adversaries':
			case 'equipment':
			case 'skills':
			case 'spells':
			case 'abilities':
			case 'effects':
				{
					context.tables = tabData.tables.map((t) => t.html);
				}
				break;
		}
		return context;
	}

	/**
	 * @function
	 */
	#configureFilters;

	/**
	 * @param configureFilter
	 */
	onNextTabChange(configureFilter) {
		this.#configureFilters = configureFilter;
	}

	/**
	 * @returns {String}
	 */
	get activeTabId() {
		return this.tabGroups.primary;
	}

	async _onFirstRender(context, options) {
		await super._onRender(context, options);
		await this.renderTables(this.activeTabId, true);
	}

	/**
	 * @override
	 * @param partId
	 * @param element
	 * @param options
	 * @private
	 */
	_attachPartListeners(partId, element, options) {
		super._attachPartListeners(partId, element, options);
		switch (partId) {
			case 'sidebar':
				{
					// Text filter
					const searchInput = element.querySelector('#search');
					if (!searchInput) {
						return;
					}
					searchInput.addEventListener(
						'input',
						HTMLUtils.debounce(() => {
							const text = searchInput.value.toLowerCase() || '';
							this.filter.setText(text);
							console.debug(`[COMPENDIUM] Text updated: ${text}`);
							this.toggleCompendiumEntries();
						}, 150),
					);
					// Checkbox filters
					element.addEventListener('change', (event) => {
						const input = event.target;
						if (!(input instanceof HTMLInputElement)) return;
						if (input.type !== 'checkbox') return;

						const { category, option } = input.dataset;
						if (!category || !option) return;
						this.filter.toggle(category, option, input.checked);
						console.debug(`[COMPENDIUM] Filter toggled: ${category}=${option} (${input.checked})`);
						this.toggleCompendiumEntries();
					});
				}
				break;

			case 'tabs': {
				const tabs = element.querySelectorAll('[data-tab]');
				for (const tab of tabs) {
					tab.addEventListener('click', (event) => {
						const tabId = event.currentTarget.dataset.tab;
						this.renderTables(tabId);
					});
				}
				break;
			}
		}
	}

	/**
	 * @typedef TableRenderingData
	 * @property {CompendiumIndexEntry[]} entries
	 * @property {CompendiumTableRenderer} renderer
	 */

	/**
	 * @param {TableRenderingData[]} tables
	 * @param {Record<string, CompendiumFilterCategory>} filters
	 */
	async onRenderTables(tables, filters) {
		let result = [];

		if (filters && Object.keys(filters).length > 0) {
			if (this.#configureFilters) {
				this.#configureFilters(filters);
				this.#configureFilters = undefined;
			}
		}

		this.filter.setCategories(filters);

		for (const trd of tables) {
			trd.entries.sort((a, b) => a.name.localeCompare(b.name));
			const html = await trd.renderer.renderTable(trd.entries, {
				hideIfEmpty: false,
				isVisible: (item) => {
					const visible = this.filter.filter(item);
					return visible;
				},
			});

			/** @type CompendiumTableData **/
			const tableData = {
				id: trd.renderer.id,
				entries: trd.entries,
				html: html,
				visible: new Set(trd.entries.map((e) => e._id)),
			};
			result.push(tableData);
		}

		this.#tabData = {
			tables: result,
			filters: filters,
		};
	}

	/**
	 * @property {HTMLElement} element
	 * @desc Given
	 */
	toggleCompendiumEntries(element = null) {
		if (!this.#tabData) {
			return;
		}

		const root = element ?? this.element;

		// For each of the tables currently being rendered
		for (const tableData of this.#tabData.tables) {
			// Rerun the filter on this table's entries
			tableData.visible.clear();
			const filteredEntries = tableData.entries.filter(this.filter.filter);
			for (const entry of filteredEntries) {
				tableData.visible.add(entry.uuid);
			}
			// Look up the table in the DOM by its data-table-id dataset property
			const selector = `#${CSS.escape(tableData.id)}`;
			const renderedTable = root.querySelector(selector);
			if (!renderedTable) {
				throw Error(`Did not find the rendered table ${tableData.id} in the DOM.`);
			}
			// If no entries are visible, hide the table
			const showTable = filteredEntries.length > 0;
			renderedTable.classList.toggle('hidden', !showTable);
			if (showTable) {
				// Look up all its list elements
				const listElements = renderedTable.querySelectorAll('li.fu-table__row-container.item');
				for (const li of listElements) {
					const uuid = li.dataset.uuid;
					// ✅ Check uuid exists
					if (!uuid) {
						console.error(`Missing uuid information on the list element ${li.toString()}`);
						continue;
					}
					// Toggle visibility based on filter
					const visible = tableData.visible.has(uuid);
					li.classList.toggle('hidden', !visible);
					//console.debug(`Toggle list element ${uuid}? ${visible}`);
				}
			}
		}
	}

	#basicRenderer = new BasicCompendiumTableRenderer();
	#abilityRenderer = new BasicCompendiumTableRenderer({ id: 'compendium-abilities' });
	#classRenderer = new BasicCompendiumTableRenderer({ id: 'compendium-classes' });
	#classFeatureRenderer = new BasicCompendiumTableRenderer({ id: 'compendium-class-features' });
	#adversaryRenderer = new AdversariesCompendiumTableRenderer({ id: 'compendium-adversary' });
	#spellRenderer = new SpellsCompendiumTableRenderer({ id: 'compendium-spells' });
	#weaponRenderer = new WeaponCompendiumTableRenderer({ id: 'compendium-weapon' });
	#armorRenderer = new ArmorCompendiumTableRenderer({ id: 'compendium-armor' });
	#accessoryRenderer = new ArmorCompendiumTableRenderer({ id: 'compendium-accessory' });
	#consumableRenderer = new ConsumableCompendiumTableRenderer({ id: 'compendium-consumable' });
	#skillRenderer = new SkillsCompendiumTableRenderer({ id: 'compendium-skills' });
	#attackRenderer = new AttackCompendiumTableRenderer({ id: 'compendium-attack' });

	/**
	 *
	 * @param {String} tabId
	 * @param {Boolean} force
	 * @param {Boolean} sidebar
	 * @returns {Promise<void>}
	 */
	async renderTables(tabId, force = false, sidebar = true) {
		if (this.activeTabId === tabId && !force) {
			return;
		}
		switch (tabId) {
			case 'classes':
				{
					const classes = await this.index.getClasses();
					const classOptions = classes.class
						.sort((a, b) => a.name.localeCompare(b.name))
						.map((c) => ({
							value: c.name,
							label: c.name,
						}));
					await this.onRenderTables(
						[
							{
								entries: classes.class,
								renderer: this.#classRenderer,
							},
							{
								entries: classes.classFeature,
								renderer: this.#classFeatureRenderer,
							},
						],
						{
							type: {
								label: 'FU.Type',
								propertyPath: 'type',
								options: [
									{
										value: 'class',
										label: 'FU.Class',
									},
									{
										value: 'classFeature',
										label: 'FU.ClassFeature',
									},
								],
							},
							class: {
								label: 'FU.ClassFeature',
								propertyPath: 'metadata.class',
								options: classOptions,
							},
						},
					);
				}
				break;

			case 'skills':
				{
					const skills = await this.index.getSkills();
					const classes = await this.index.getItemsOfType('class');
					const classOptions = classes
						.sort((a, b) => a.name.localeCompare(b.name))
						.map((c) => ({
							value: c.name,
							label: c.name,
						}));
					await this.onRenderTables(
						[
							{
								entries: skills.skill,
								renderer: this.#skillRenderer,
							},
							{
								entries: skills.heroic,
								renderer: this.#basicRenderer,
							},
						],
						{
							class: {
								label: 'FU.Class',
								propertyPath: 'system.class.value',
								options: classOptions,
							},
						},
					);
				}
				break;

			case 'abilities':
				{
					const abilities = await this.index.getAbilities();
					await this.onRenderTables(
						[
							{
								entries: abilities.basic,
								renderer: this.#attackRenderer,
							},
							{
								entries: abilities.miscAbility,
								renderer: this.#abilityRenderer,
							},
							{
								entries: abilities.rule,
								renderer: this.#basicRenderer,
							},
						],
						{
							type: {
								label: 'FU.Type',
								propertyPath: 'type',
								options: [
									{
										value: 'basic',
										label: 'FU.Attack',
									},
									{
										value: 'miscAbility',
										label: 'FU.Ability',
									},
									{
										value: 'rule',
										label: 'FU.Rule',
									},
								],
							},
							attackDamage: {
								label: 'FU.DamageType',
								propertyPath: CompendiumIndex.itemFields.weaponDamageType,
								options: FoundryUtils.getFormOptions(FU.damageTypes),
							},
						},
					);
				}
				break;

			case 'equipment':
				{
					const equipment = await this.index.getEquipment();
					await this.onRenderTables(
						[
							{
								entries: equipment.weapon,
								renderer: this.#weaponRenderer,
							},
							{
								entries: equipment.armor,
								renderer: this.#armorRenderer,
							},
							{
								entries: equipment.accessory,
								renderer: this.#accessoryRenderer,
							},
							{
								entries: equipment.consumable,
								renderer: this.#consumableRenderer,
							},
						],
						{
							type: {
								label: 'FU.Type',
								propertyPath: 'type',
								options: [
									{
										value: 'weapon',
										label: 'FU.Weapon',
									},
									{
										value: 'armor',
										label: 'FU.Armor',
									},
									{
										value: 'accessory',
										label: 'FU.Accessory',
									},
									{
										value: 'consumable',
										label: 'FU.Consumable',
									},
								],
							},
							weaponCategory: {
								label: 'FU.Category',
								propertyPath: CompendiumIndex.itemFields.weaponCategory,
								options: FoundryUtils.getFormOptions(FU.weaponCategories),
							},
							weaponDamage: {
								label: 'FU.DamageType',
								propertyPath: CompendiumIndex.itemFields.weaponDamageType,
								options: FoundryUtils.getFormOptions(FU.damageTypes),
							},
						},
					);
				}
				break;

			case 'adversaries':
				{
					const characters = await this.index.getCharacters();
					await this.onRenderTables(
						[
							{
								entries: characters.npc,
								renderer: this.#adversaryRenderer,
							},
						],
						{
							species: {
								label: 'FU.Species',
								propertyPath: 'system.species.value',
								options: FoundryUtils.getFormOptions(FU.species),
							},
							rank: {
								label: 'FU.Rank',
								propertyPath: 'system.rank.value',
								options: FoundryUtils.getFormOptions(FU.rank),
							},
							role: {
								label: 'FU.Role',
								propertyPath: 'system.role.value',
								options: FoundryUtils.getFormOptions(FU.role),
							},
						},
					);
				}
				break;

			case 'spells':
				{
					const spells = await this.index.getItemsOfType('spell');
					const classes = ['Spiritist', 'Entropist', 'Elementalist']; // hardcoded for now
					const classOptions = classes.map((c) => {
						return {
							value: c,
							label: c,
						};
					});
					await this.onRenderTables(
						[
							{
								entries: spells,
								renderer: this.#spellRenderer,
							},
						],
						{
							class: {
								label: 'FU.Class',
								propertyPath: 'system.class.value',
								options: classOptions,
							},
							damageType: {
								label: 'FU.DamageType',
								propertyPath: CompendiumIndex.itemFields.spellDamageType,
								options: FoundryUtils.getFormOptions(FU.damageTypes),
							},
						},
					);
				}
				break;

			case 'effects':
				{
					const effects = await this.index.getItemsOfType('effect');
					await this.onRenderTables([
						{
							entries: effects,
							renderer: this.#basicRenderer,
						},
					]);
				}
				break;
		}

		let parts = [tabId];
		if (sidebar) {
			parts.push('sidebar');
		}
		this.render(false, { parts: parts });
	}

	static initialize() {
		/**
		 * @param {SystemControlTool[]} tools
		 */
		const onGetSystemTools = (tools) => {
			tools.push({
				name: 'FU.CompendiumBrowser',
				icon: 'fa-solid fa-book',
				onClick: () => {
					CompendiumBrowser.instance.render(true);
				},
			});
		};
		Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, onGetSystemTools);
	}

	/**
	 * @param {CompendiumBrowserTab} tab The initial tab to open.
	 * @param {CompendiumFilterInputOptions} inputFilter Initial filtering for the tab.
	 */
	static async open(tab, inputFilter) {
		const instance = CompendiumBrowser.instance;
		instance.filter.setText(inputFilter.text);
		instance.onNextTabChange((filters) => {
			// TODO: Implement support for generic filters
			if (inputFilter.actorId) {
				const actor = fromUuidSync(inputFilter.actorId);
				if (actor) {
					const classNames = actor.getItemsByType('class').map((i) => i.name);
					switch (tab) {
						case 'skills':
						case 'spells':
							filters.class.selected = new Set(classNames);
							break;
					}
				}
			}
		});
		instance.render(true, {
			tab: tab,
		});
	}

	/**
	 * @this CompendiumBrowser
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async refresh(event, target) {
		// TODO: Reload indexes
	}
}
