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
			width: 1024,
			height: 768,
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
	/**
	 * @type String[]
	 * @desc The classes currently held by the character.
	 **/
	#classList;
	/** @type {Record<String, AdvancementSkillReference>} **/
	#skillMap;
	/** @type FUItem **/
	#current;
	/** @type String **/
	#skillClass;
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

		const level = data.index + 1;
		this.#current = data.actor.items.get(itemId);
		this.#actorItemFuids = new Set(data.actor.items.map((item) => item.system?.fuid).filter(Boolean));
		this.#summary = AdvancementTracker.evaluate(data.actor, level);
		this.#trackedItems = AdvancementTracker.getTrackedItems(data.actor, level);
		this.#trackedItemIds = new Set(this.#trackedItems.map((item) => item.id));

		// Filter these up to the current advancements
		this.#skillClass = this.getSkillClass();
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

	getSkillClass() {
		let _class;

		if (this.#advancement.class.id) {
			const classItem = this.#actor.items.get(this.#advancement.class.id);
			_class = classItem.system.fuid;
		} else if (this.#advancement.skill.id) {
			const skillItem = this.#actor.items.get(this.#advancement.skill.id);
			const classReqs = CompendiumIndex.getClassRequirements(skillItem);
			if (classReqs.length === 1) {
				_class = classReqs[0];
			}
		}

		return _class;
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
			})
			.flat();
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

	/**
	 * @typedef AdvancementOption
	 * @property {String} name
	 * @property {'entry'|'item'} type
	 * @property {CompendiumIndexEntry} entry
	 * @property {FUItem} item
	 * @property {String[]} classes
	 */

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

		switch (this.#type) {
			case 'class':
				actorItems = this.getMatchingItems().filter((item) => {
					return !this.#trackedItemIds.has(item.id);
				});
				break;

			case 'spell':
				compendiumEntries = compendiumEntries.filter((entry) => {
					const classReqs = CompendiumIndex.getClassRequirements(entry);
					// If unlocked, can pick from any class
					if (!this.#data.unlock && this.#skillClass && !classReqs.includes(this.#skillClass)) {
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
					if (this.#skillClass && !classReqs.includes(this.#skillClass)) {
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
					if (this.#skillClass && !classReqs.includes(this.#skillClass)) {
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
					if (this.#skillClass && !classReqs.includes(this.#skillClass)) {
						return false;
					}
					return classReqs.some((req) => this.#classList.includes(req) && this.#summary.classes[req]?.level === 10);
				});
				actorItems = this.getMatchingItems().filter((item) => {
					const classReqs = CompendiumIndex.getClassRequirements(item);
					if (classReqs.length === 0) {
						return true;
					}
					if (this.#skillClass && !classReqs.includes(this.#skillClass)) {
						return false;
					}
					return classReqs.some((req) => this.#classList.includes(req) && this.#summary.classes[req]?.level === 10);
				});
				break;
		}

		// Sort entries
		actorItems = ObjectUtils.sortArray(actorItems, 'name');
		compendiumEntries = ObjectUtils.sortArray(compendiumEntries, 'name');

		/** @type AdvancementOption[] **/
		options = [];
		options.push(
			...actorItems.map((item) => {
				return {
					name: item.name,
					type: 'item',
					item: item,
					classes: CompendiumIndex.getClassRequirements(item),
				};
			}),
		);
		options.push(
			...compendiumEntries.map((entry) => {
				return {
					name: entry.name,
					type: 'entry',
					entry: entry,
					classes: CompendiumIndex.getClassRequirements(entry),
				};
			}),
		);

		options = ObjectUtils.sortArray(options, 'name');

		// GROUPS
		const CARD_SIZE = 96;
		const HUB_RADIUS = 120;
		const ORBIT_GAP = 8;
		let groupedOptions;
		let groupedData;
		if (this.#data.type !== 'class') {
			groupedOptions = AdvancementBrowser.groupOptionsByClass(options);
			groupedData = groupedOptions.map((group) => {
				const positions = AdvancementBrowser.computeOrbitalPositions(group.options.length, CARD_SIZE, HUB_RADIUS, ORBIT_GAP);
				const radius = positions.length ? Math.hypot(positions[0].x, positions[0].y) : HUB_RADIUS;
				const size = (radius + CARD_SIZE) * 2 - 40;
				const options = group.options.map((option, i) => ({
					...option,
					_x: positions[i].x,
					_y: positions[i].y,
				}));
				return { ...group, options, _size: size };
			});
		}

		const classReferences = await CompendiumIndex.instance.getClassReferences();

		return {
			actor: this.#actor,
			data: this.#advancement,
			current: this.#current,
			type: this.#type,
			index: this.#index,
			skillMap: this.#skillMap,
			summary: this.#summary,
			options,
			classes: Object.fromEntries(classReferences.map((cls) => [cls.fuid, cls])),
			groupedOptions,
			groupedData,
			compendiumEntries,
			actorItems,
		};
	}

	/**
	 * Groups options by class for template rendering.
	 * Options belonging to multiple classes are duplicated into each group.
	 * Options with no classes fall into a catch-all 'shared' group.
	 *
	 * @param {AdvancementOption[]} options
	 * @returns {Array<{classId: string, options: AdvancementOption[]}>}
	 */
	static groupOptionsByClass(options) {
		const groupMap = new Map();

		for (const option of options) {
			const classes = option.classes?.length ? option.classes : ['shared'];

			for (const classId of classes) {
				if (!groupMap.has(classId)) {
					groupMap.set(classId, { classId, options: [] });
				}
				groupMap.get(classId).options.push(option);
			}
		}

		return Array.from(groupMap.values());
	}

	/**
	 * @desc Computes positions for cards evenly distributed on a single orbit ring.
	 * The ring radius grows automatically to prevent card overlap.
	 * @param {number} itemCount - Total number of cards to place
	 * @param {number} cardSize - Width/height of each card in px
	 * @param {number} hubRadius - Radius of the central hub circle in px
	 * @param {number} orbitGap - Gap between hub edge and card center in px
	 * @returns {Array<{x: number, y: number}>}
	 */
	static computeOrbitalPositions(itemCount, cardSize, hubRadius, orbitGap = 32) {
		if (itemCount === 0) return [];

		// Minimum radius so cards don't overlap each other
		const minRadiusForCards = (itemCount * (cardSize + 5)) / (2 * Math.PI);
		// Minimum radius so cards clear the hub
		const minRadiusForHub = hubRadius + orbitGap + cardSize * 0.25;

		const radius = Math.max(minRadiusForCards, minRadiusForHub);

		return Array.from({ length: itemCount }, (_, i) => {
			const angle = (2 * Math.PI * i) / itemCount - Math.PI / 2;
			return {
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
			};
		});
	}

	/**
	 * @desc Computes the bounding box size needed to contain all orbital positions.
	 * @param {Array<{x: number, y: number}>} positions
	 * @param {number} cardSize
	 * @returns {{width: number, height: number}}
	 */
	static computeOrbitBounds(positions, cardSize = 80) {
		if (!positions.length) return { width: cardSize, height: cardSize };
		const xs = positions.map((p) => p.x);
		const ys = positions.map((p) => p.y);
		const width = Math.max(...xs) - Math.min(...xs) + cardSize;
		const height = Math.max(...ys) - Math.min(...ys) + cardSize;
		return { width, height };
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
