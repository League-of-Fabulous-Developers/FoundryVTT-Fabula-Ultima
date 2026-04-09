import FUApplication from './application.mjs';
import { systemTemplatePath } from '../helpers/system-utils.mjs';
import { CompendiumIndex } from './compendium/compendium-index.mjs';
import { SkillTraits } from '../pipelines/traits.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { AdvancementTracker } from '../documents/actors/character/advancement-tracker.mjs';
import { ObjectUtils } from '../helpers/object-utils.mjs';

export class AdvancementBrowser extends FUApplication {
	static DEFAULT_OPTIONS = {
		window: {
			classes: 'fu-dialog',
			title: 'FU.Advancements',
			icon: 'ra ra-tower',
			resizable: true,
		},
		position: {
			width: 700,
			height: 580,
		},
		actions: {
			assignItem: this.#assignItem,
			addItem: this.#addItem,
			clearItem: this.#clearItem,
		},
	};

	/** @type {FUActor} **/
	#actor;
	/** @type {'class'|'skill'|'spell'|'heroic'} **/
	#type;
	/** @type {String} **/
	#path;
	/** @type {Number} **/
	#index;
	/** @type AdvancementDataModel **/
	#advancement;
	/** @type Set<String> **/
	#trackedItemIds;
	/** @type FUItem[] **/
	#trackedItems;
	/** @type Set<String> **/
	#actorItemFuids;
	/** @type String[] **/
	#spellList;
	/** @type String[] **/
	#classList;
	/** @type {Record<String, AdvancementSkillReference>} **/
	#skillMap;
	/** @type FUItem **/
	#current;
	/** @type AdvancementSummary **/
	#summary;

	static PARTS = {
		main: {
			template: systemTemplatePath('app/advancement-browser'),
		},
	};

	constructor(actor, type, index, path) {
		super();
		this.#actor = actor;
		this.#type = type;
		this.#index = index;
		this.#advancement = actor.system.advancements[index].toObject();
		this.#path = path ?? type;
		const reference = ObjectUtils.getProperty(this.#advancement, this.#path);

		this.#current = actor.items.get(reference.id);
		this.#actorItemFuids = new Set(actor.items.map((item) => item.system?.fuid).filter(Boolean));
		this.#trackedItemIds = AdvancementTracker.getTrackedItemIds(actor, index + 1);
		this.#trackedItems = AdvancementTracker.getTrackedItems(actor, index + 1);
		this.#summary = AdvancementTracker.evaluate(actor);

		// Filter these up to the current advancements
		this.#spellList = this.getSpellList();
		this.#classList = this.getClassList();
		this.#skillMap = this.getSkillMap();
	}

	getSpellList() {
		return this.#trackedItems
			.filter((item) => {
				if (item.type !== 'skill') {
					return false;
				}
				/** @type SkillDataModel **/
				const sd = item.system;
				return sd.traits.has(SkillTraits.GrantSpell);
			})
			.map((item) => {
				return item.system.class.value;
			});
	}

	getClassList() {
		return this.#trackedItems
			.filter((item) => item.type === 'class')
			.map((item) => {
				return item.name;
			});
	}

	getSkillMap() {
		const skills = AdvancementTracker.getSkillAdvancements(this.#actor, this.#index + 1);
		/** @type {Record<String, AdvancementSkillReference>} **/
		let list = {};
		for (const skill of skills) {
			if (list[skill.id] === undefined) {
				list[skill.id] = {
					id: skill.id,
					value: skill.value,
					max: skill.max,
				};
			} else {
				list[skill.id].value++;
			}
		}
		return list;
	}

	get level() {
		return this.#index + 1;
	}

	/**
	 * @returns {FUItem[]}
	 */
	getMatchingItems() {
		return this.#actor.getItemsByType(this.#type);
	}

	/** @override */
	async _prepareContext(options) {
		// Items the actor already has
		let actorItems;
		// Items which the actor does not have
		let compendiumEntries = await CompendiumIndex.instance.getItemsOfType(this.#type);
		compendiumEntries = compendiumEntries.filter((entry) => {
			if (entry.name.includes('[Legacy]')) {
				return false;
			}
			return !this.#actorItemFuids.has(entry.system.fuid);
		});

		// Whether the items to be selected are class-specific
		/** @type String **/
		let specificClass = undefined;
		if (this.#advancement.class.id) {
			const classItem = this.#actor.items.get(this.#advancement.class.id);
			specificClass = classItem.name;
		}

		switch (this.#type) {
			case 'class':
				actorItems = this.getMatchingItems().filter((item) => {
					return !this.#trackedItemIds.has(item.id);
				});
				break;

			case 'spell':
				// Get only spells from class spell lists the character has access to
				compendiumEntries = compendiumEntries.filter((entry) => {
					const className = entry.system.class.value;
					if (specificClass && className !== specificClass) {
						return false;
					}
					return this.#spellList.includes(className);
				});
				actorItems = this.getMatchingItems().filter((item) => {
					return !this.#trackedItemIds.has(item.id) && this.#spellList.includes(item.system.class.value);
				});
				break;

			case 'skill':
				// Get only skills from classes that the actor has
				compendiumEntries = compendiumEntries.filter((entry) => {
					const className = entry.system.class.value;
					if (specificClass && className !== specificClass) {
						return false;
					}
					return this.#classList.includes(className) && this.#summary.classes[className].level < 10;
				});
				// If owned, return skills that we have not yet maxed
				actorItems = Object.values(this.#skillMap)
					.filter((skill) => {
						return skill.value !== skill.max;
					})
					.map((skill) => this.#actor.items.get(skill.id));
				// Add items that are owned but not yet being tracked
				actorItems = actorItems.concat(
					this.getMatchingItems().filter((item) => {
						return this.#skillMap[item.id] === undefined;
					}),
				);
				// Filter items from classes the actor has
				actorItems = actorItems.filter((item) => {
					const className = item.system.class.value;
					if (specificClass && className !== specificClass) {
						return false;
					}
					return this.#classList.includes(className) && this.#summary.classes[className].level < 10;
				});
				break;

			case 'heroic':
				// Get only skills from classes that the actor has
				compendiumEntries = compendiumEntries.filter((entry) => {
					const className = entry.system.class.value;
					// Entries that specify no class can be picked up by ANY class
					if (!className) {
						return true;
					}
					if (specificClass && className !== specificClass) {
						return false;
					}
					return this.#classList.includes(className) && this.#summary.classes[className].level === 10;
				});
				// Filter items from classes the actor has
				actorItems = this.getMatchingItems().filter((item) => {
					const className = item.system.class.value;
					if (specificClass && className && className !== specificClass) {
						return false;
					}
					return this.#classList.includes(className) && this.#summary.classes[className].level === 10;
				});
				break;
		}

		// Sort entries
		actorItems = ObjectUtils.sortArray(actorItems, 'name');
		compendiumEntries = ObjectUtils.sortArray(compendiumEntries, 'name');

		options = [];
		options.push(
			...actorItems.map((item) => {
				return {
					name: item.name,
					type: 'item',
					item: item,
				};
			}),
		);
		options.push(
			...compendiumEntries.map((entry) => {
				return {
					name: entry.name,
					type: 'entry',
					entry: entry,
				};
			}),
		);
		options = ObjectUtils.sortArray(options, 'name');

		return {
			actor: this.#actor,
			data: this.#advancement,
			current: this.#current,
			type: this.#type,
			index: this.#index,
			skillMap: this.#skillMap,
			summary: this.#summary,
			options,
			compendiumEntries,
			actorItems,
		};
	}

	/**
	 * @this AdvancementBrowser
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #assignItem(event, target) {
		const { id } = target.dataset;
		const item = this.#actor.getItemById(id);
		//ui.notifications.info(`Assigning ${item.name} to advancement of level ${this.level}`);

		return AdvancementTracker.updateEntry(this.#actor, this.#index, (entry) => {
			AdvancementBrowser.#updateEntry(this, entry, item);
		});
	}

	/**
	 * @this AdvancementBrowser
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addItem(event, target) {
		const { uuid } = target.dataset;
		const item = await fromUuid(uuid);
		ui.notifications.info(`Adding ${item.name} to advancement of level ${this.level}`);

		// TODO: Add item to actor, get id
		const createdItem = await FoundryUtils.addItemToActor(this.#actor, item);

		return AdvancementTracker.updateEntry(this.#actor, this.#index, (entry) => {
			AdvancementBrowser.#updateEntry(this, entry, createdItem);
		});
	}

	/**
	 * @param {AdvancementBrowser} browser
	 * @param {AdvancementDataModel} entry
	 * @param {FUItem} item
	 */
	static #updateEntry(browser, entry, item) {
		const id = item.id;
		const type = browser.#type;
		switch (type) {
			case 'class':
				entry.class.id = id;
				break;

			case 'skill':
				{
					entry.skill.id = id;
					const current = browser.#skillMap[id]?.value ?? 0;
					entry.skill.value = current + 1;
					entry.skill.max = item.system.level.max;
					if (!entry.class.id) {
						entry.class.locked = true;
					}
				}
				break;

			case 'spell':
				entry.entries.spell.id = id;
				break;

			case 'heroic':
				entry.entries.heroic.id = id;
				break;
		}
	}

	/**
	 * @this AdvancementBrowser
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #clearItem(event, target) {
		const item = this.#current;
		ui.notifications.info(`Clearing ${item.name} from advancement level ${this.level}`);

		return AdvancementTracker.updateEntry(this.#actor, this.#index, (entry) => {
			switch (this.#type) {
				case 'class':
					entry.class.id = undefined;
					entry.skill.id = undefined;
					delete entry.entries.spell;
					delete entry.entries.heroic;
					break;

				case 'skill':
					entry.class.locked = false;
					entry.skill.id = undefined;
					delete entry.entries.spell;
					delete entry.entries.heroic;
					break;

				case 'spell':
					entry.entries.spell.id = undefined;
					break;

				case 'heroic':
					entry.entries.heroic.id = undefined;
					break;
			}
		});
	}
}
