import FUApplication from './application.mjs';
import { systemTemplatePath } from '../helpers/system-utils.mjs';
import { CompendiumIndex } from './compendium/compendium-index.mjs';
import { SkillTraits } from '../pipelines/traits.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { AdvancementTracker } from '../documents/actors/character/advancement-tracker.mjs';
import { ObjectUtils } from '../helpers/object-utils.mjs';

/**
 * @typedef {'class'|'skill'|'spell'|'heroic'} AdvancementAssignmentType
 */

/**
 * @typedef SetAdvancementData
 * @property {FUActor} actor
 * @property {AdvancementAssignmentType} type
 * @property {String} path
 * @property {Number} index The advancement index (its level)
 * @property {Boolean} unlock Whether to unlock all entries of the type.
 * @property {Number} collectionIndex Some advancements have collections of their own.
 */

export class AdvancementBrowser extends FUApplication {
	static DEFAULT_OPTIONS = {
		classes: ['fu-dialog'],
		window: {
			contentClasses: ['pfu-advancements__background'],
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

	/**
	 * @type {SetAdvancementData}
	 */
	#data;
	/** @type {FUActor} **/
	#actor;
	/** @type {AdvancementAssignmentType} **/
	#type;
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

	/**
	 * @param {SetAdvancementData} data
	 */
	constructor(data) {
		super();
		this.#data = data;
		this.#actor = data.actor;
		this.#type = data.type;
		this.#index = data.index;
		this.#advancement = data.actor.system.advancements[data.index].toObject();

		let itemId;
		if (this.isCollection) {
			/** @type AdvancementCollectionReference **/
			const collection = ObjectUtils.getProperty(this.#advancement, data.path);
			itemId = collection.ids[data.collectionIndex];
		} else {
			const path = data.path ?? data.type;
			/** @type AdvancementReference **/
			const reference = ObjectUtils.getProperty(this.#advancement, path);
			itemId = reference.id;
		}

		this.#current = data.actor.items.get(itemId);
		this.#actorItemFuids = new Set(data.actor.items.map((item) => item.system?.fuid).filter(Boolean));
		this.#summary = AdvancementTracker.evaluate(data.actor);
		this.#trackedItems = AdvancementTracker.getTrackedItems(data.actor, data.index + 1);
		this.#trackedItemIds = new Set(this.#trackedItems.map((item) => item.id));

		// Filter these up to the current advancements
		this.#spellList = this.getSpellList();
		this.#classList = this.getClassList();
		this.#skillMap = this.getSkillMap();
	}

	/**
	 * @returns {boolean}
	 */
	get isCollection() {
		return !Number.isNaN(this.#data.collectionIndex);
	}

	get level() {
		return this.#index + 1;
	}

	getSpellList() {
		if (this.#data.unlock) {
			return CompendiumIndex.spellGrantingClasses;
		}
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
				return CompendiumIndex.getClassRequirements(item);
			});
	}

	getClassList() {
		return this.#trackedItems
			.filter((item) => item.type === 'class')
			.map((item) => {
				return item.system.fuid;
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
			specificClass = classItem.system.fuid;
		}

		switch (this.#type) {
			case 'class':
				actorItems = this.getMatchingItems().filter((item) => {
					return !this.#trackedItemIds.has(item.id);
				});
				break;

			case 'spell':
				compendiumEntries = compendiumEntries.filter((entry) => {
					const classReqs = CompendiumIndex.getClassRequirements(entry);
					if (specificClass && !classReqs.includes(specificClass)) {
						return false;
					}
					return this.#spellList.length > 0 ? this.#spellList.some((s) => classReqs.includes(s)) : true;
				});
				actorItems = this.getMatchingItems().filter((item) => {
					if (this.#trackedItemIds.has(item.id)) {
						return false;
					}
					const classReqs = CompendiumIndex.getClassRequirements(item);
					return this.#spellList.length > 0 ? this.#spellList.some((s) => classReqs.includes(s)) : true;
				});
				break;

			case 'skill':
				compendiumEntries = compendiumEntries.filter((entry) => {
					const classReqs = CompendiumIndex.getClassRequirements(entry);
					if (specificClass && !classReqs.includes(specificClass)) {
						return false;
					}
					return classReqs.some((req) => this.#classList.includes(req) && this.#summary.classes[req]?.level < 10);
				});
				actorItems = Object.values(this.#skillMap)
					.filter((skill) => skill.value !== skill.max)
					.map((skill) => this.#actor.items.get(skill.id));
				actorItems = actorItems.concat(this.getMatchingItems().filter((item) => this.#skillMap[item.id] === undefined));
				actorItems = actorItems.filter((item) => {
					const classReqs = CompendiumIndex.getClassRequirements(item);
					if (specificClass && !classReqs.includes(specificClass)) {
						return false;
					}
					return classReqs.some((req) => this.#classList.includes(req) && this.#summary.classes[req]?.level < 10);
				});
				break;

			case 'heroic':
				compendiumEntries = compendiumEntries.filter((entry) => {
					const classReqs = CompendiumIndex.getClassRequirements(entry);
					if (classReqs.length === 0) {
						return true;
					}
					if (specificClass && !classReqs.includes(specificClass)) {
						return false;
					}
					return classReqs.some((req) => this.#classList.includes(req) && this.#summary.classes[req]?.level === 10);
				});
				actorItems = this.getMatchingItems().filter((item) => {
					const classReqs = CompendiumIndex.getClassRequirements(item);
					if (classReqs.length === 0) {
						return true;
					}
					if (specificClass && !classReqs.includes(specificClass)) {
						return false;
					}
					return classReqs.some((req) => this.#classList.includes(req) && this.#summary.classes[req]?.level === 10);
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
		ui.notifications.info(`Adding ${item.name} to level ${this.level} advancement.`);

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

		if (browser.isCollection) {
			/** @type AdvancementCollectionReference **/
			const collection = ObjectUtils.getProperty(entry, browser.#data.path);
			collection.ids.push(id);
		} else {
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
	}

	/**
	 * @this AdvancementBrowser
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #clearItem(event, target) {
		const item = this.#current;
		ui.notifications.info(`Removing ${item.name} from level ${this.level} advancement.`);

		return AdvancementTracker.updateEntry(this.#actor, this.#index, (entry) => {
			if (this.isCollection) {
				/** @type AdvancementCollectionReference **/
				const collection = ObjectUtils.getProperty(entry, this.#data.path);
				collection.ids.splice(this.#data.collectionIndex, 1);
			} else {
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
						entry.skill.value = entry.skill.max = undefined;
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
			}
		});
	}
}
