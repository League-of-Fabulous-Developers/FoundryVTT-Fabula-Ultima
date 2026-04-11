import { systemId } from '../../helpers/system-utils.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { SETTINGS } from '../../settings.js';
import { StringUtils } from '../../helpers/string-utils.mjs';

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
 * @typedef CompendiumSourceInfo
 * @property {String} id The package id.
 * @property {'system'|'module'|'world'}  type
 * @property {String} title Human readable name.
 */

/**
 * @typedef EquipmentEntries
 * @property {CompendiumIndexEntry[]} armor
 * @property {CompendiumIndexEntry[]} weapon
 * @property {CompendiumIndexEntry[]} shield
 * @property {CompendiumIndexEntry[]} consumable
 * @property {CompendiumIndexEntry[]} accessory
 */

/**
 * @typedef ClassEntries
 * @property {CompendiumIndexEntry[]} class
 * @property {CompendiumIndexEntry[]} classFeature
 */

/**
 * @typedef SkillEntries
 * @property {CompendiumIndexEntry[]} skill
 * @property {CompendiumIndexEntry[]} heroic
 * @property {CompendiumIndexEntry[]} miscAbility
 * @property {CompendiumIndexEntry[]} rule
 */

/**
 * @typedef AbilityEntries
 * @property {CompendiumIndexEntry[]} basic
 * @property {CompendiumIndexEntry[]} miscAbility
 * @property {CompendiumIndexEntry[]} rule
 */

/**
 * @typedef CharacterEntries
 * @property {CompendiumIndexEntry[]} character
 * @property {CompendiumIndexEntry[]} npc
 * @property {CompendiumIndexEntry[]} stash
 */

/**
 * @desc Handles indexing of system-specific documents.
 */
export class CompendiumIndex {
	/**
	 * The current compendium index.
	 * @type {CompendiumIndex}
	 */
	static #instance;

	/**
	 * @returns {CompendiumIndex}
	 */
	static get instance() {
		if (!CompendiumIndex.#instance) {
			CompendiumIndex.#instance = new CompendiumIndex();
		}
		return CompendiumIndex.#instance;
	}

	/**
	 * @desc Forces the index to be reinitialized.
	 */
	static reinitialize() {
		console.debug(`Refreshing PFU compendium index.`);
		CompendiumIndex.#instance = undefined;
	}

	/**
	 * @desc Where the keys are the item types.
	 * @type {Record<string, CompendiumIndexEntry[]>}
	 */
	#itemsByType;

	/**
	 * @desc All compendium items by their fuid.
	 @type {Record<string, CompendiumIndexEntry>}
	 */
	#itemsByFuid;

	/**
	 * @desc All compendium items by their fuid.
	 @type {CompendiumIndexEntry[]}
	 */
	#effects;

	/**
	 * @desc Where the keys are the actor types.
	 * @type {Record<string, CompendiumIndexEntry[]>}
	 */
	#actorsByType;

	#effectIdList;
	#classList;

	/**
	 * @type {string[]}
	 */
	static spellGrantingClasses = ['Elementalist', 'Entropist', 'Spiritist'];

	// Actors
	static npcFields = Object.freeze({
		species: 'system.species.value',
		rank: 'system.rank.value',
		role: 'system.role.value',
	});

	static actorFields = Object.freeze({
		...CompendiumIndex.npcFields,
	});

	// TODO: Encode label, options data
	/**
	 * @desc The fields that are being indexed.
	 * @returns {Record<string, string>}
	 */
	static itemFields = Object.freeze({
		// Shared
		cost: 'system.cost.value',
		source: 'system.source',
		fuid: 'system.fuid',

		// Feature
		featureType: 'system.featureType',

		// Class
		class: 'system.class.value',
		levelMax: 'system.level.max',

		// Spells
		duration: 'system.duration.value',
		costAmount: 'system.cost.amount',
		spellDamageType: 'system.rollInfo.damage.type.value',

		// Weapons
		damage: 'system.damage.value',
		weaponDamageType: 'system.damageType.value',
		weaponCategory: 'system.category.value',
		type: 'system.type.value',

		// Armor
		defAttribute: 'system.def.attribute',
		defValue: 'system.def.value',
		mdefAttribute: 'system.mdef.attribute',
		mdefValue: 'system.mdef.value',

		// Consumables
		ipCost: 'system.ipCost.value',
	});

	/**
	 * @param {Boolean} force
	 * @returns {Promise<Record<string, CompendiumIndexEntry[]>>}
	 */
	async getItems(force = false) {
		if (!this.#itemsByType || force) {
			this.#itemsByType = await this.getEntries('Item', null, Object.values(CompendiumIndex.itemFields));
		}
		return this.#itemsByType;
	}

	/**
	 * @param {String} fuid An unique identifier used by the system.
	 * @returns {Promise<CompendiumIndexEntry>} A compendium index entry.
	 */
	async getItemByFuid(fuid) {
		if (!this.#itemsByFuid) {
			this.#itemsByFuid = {};
			const itemGroups = await this.getItems();
			const itemEntries = Object.values(itemGroups).flat();
			for (const item of itemEntries) {
				const fuid = item.system.fuid;
				if (fuid) {
					this.#itemsByFuid[fuid] = item;
				}
			}
		}

		return this.#itemsByFuid[fuid] ?? null;
	}

	/**
	 *
	 * @param {String} type The item type.
	 * @param {Boolean} force
	 * @returns {Promise<CompendiumIndexEntry[]>}
	 */
	async getItemsOfType(type, force = false) {
		const entries = await this.getItems(force);
		if (entries[type]) {
			return entries[type];
		}
		return [];
	}

	/**
	 * @param {Boolean} force
	 * @returns {Promise<Record<string, CompendiumIndexEntry[]>>}
	 */
	async getActors(force) {
		if (!this.#actorsByType || force) {
			this.#actorsByType = await this.getEntries('Actor', null, Object.values(CompendiumIndex.actorFields));
		}
		return this.#actorsByType;
	}

	/**
	 *
	 * @param {String} type The actor type.
	 * @param {Boolean} force
	 * @returns {Promise<CompendiumIndexEntry[]>}
	 */
	async getActorsOfType(type, force = false) {
		const entries = await this.getActors(force);
		if (entries[type]) {
			return entries[type];
		}
		return [];
	}

	/**
	 * @desc Returns all indexed effect items, which are containers of effects.
	 * @returns {Promise<CompendiumIndexEntry[]>}
	 */
	async getEffects() {
		if (!this.#effects) {
			this.#effects = await this.getItemsOfType('effect');
		}
		return this.#effects;
	}

	/**
	 * @desc Returns the fuids of all indexed effect items.
	 * @returns {Promise<String[]>}
	 */
	async getEffectIdList() {
		if (!this.#effectIdList) {
			const effects = await this.getEffects();
			let result = new Set();
			for (const effect of effects) {
				const fuid = effect.system.fuid;
				if (fuid) {
					result.add(fuid);
				}
			}
			this.#effectIdList = Array.from(result);
		}
		return this.#effectIdList;
	}

	/**
	 * @returns {Promise<String[]>} The fuids of all indexed class items.
	 */
	async getClassList() {
		if (!this.#classList) {
			const classInfo = await this.getClasses();
			let result = new Set();
			for (const entry of classInfo.class) {
				const fuid = entry.system.fuid;
				if (fuid) {
					result.add(fuid);
				}
			}
			this.#classList = Array.from(result);
		}
		return this.#classList;
	}

	/**
	 * @param {FUItem|CompendiumIndexEntry} document The entry or item that is referencing the class it's associated to.
	 */
	static getClassReference(document) {
		if (document.system?.class?.value) {
			return StringUtils.titleToKebab(document.system.class.value);
		}
		return '';
	}

	/**
	 * @param {String} type type of document.
	 * @returns {[]}
	 */
	getSystemPacks(type) {
		return game.packs.filter((p) => p.documentName === type && p.metadata.packageName.startsWith(systemId));
	}

	/**
	 * @param {String} type type of document.
	 * @returns {[]}
	 */
	getPacks(type) {
		const setting = game.settings.get(SYSTEM, SETTINGS.optionCompendiumBrowserPacks);
		return game.packs.filter((p) => {
			const isSystemPack = p.collection.startsWith(`${systemId}.`);
			switch (setting) {
				case 'system':
					if (!isSystemPack) {
						return false;
					}
					break;
				case 'custom':
					if (isSystemPack) {
						return false;
					}
					break;
			}
			return p.documentName === type;
		});
	}

	/**
	 * @returns {CompendiumSourceInfo[]}
	 */
	getLoadedCompendiumSourceInfo() {
		const sources = new Map();

		for (const pack of game.packs) {
			const pkg = pack.metadata.packageName;
			if (!pkg || sources.has(pkg)) continue;
			if (pack.metadata.system !== systemId) continue;

			// World packs
			if (pkg === 'world') {
				sources.set(pkg, {
					id: 'world',
					type: 'world',
					title: game.world.title,
				});
				continue;
			}

			// System packs
			if (pkg === game.system.id) {
				sources.set(pkg, {
					id: pkg,
					type: 'system',
					title: game.system.title,
				});
				continue;
			}

			// Module packs
			const module = game.modules.get(pkg);
			if (module) {
				sources.set(pkg, {
					id: pkg,
					type: 'module',
					title: module.title,
				});
			}
		}

		return [...sources.values()];
	}

	/**
	 * @param {string} document Document type (e.g. "Item")
	 * @param {string} type The document subtype. (Such as what type of items like armor, weapons)
	 * @param {string[]} fields The fields to record
	 * @returns {Promise<Record<string, CompendiumIndexEntry[]>>}
	 */
	async getEntries(document, type, fields = []) {
		console.debug(`Fetching entries for document: ${document}`);

		/** @type {Record<string, CompendiumIndexEntry[]>} */
		const result = {};
		const packs = this.getPacks(document);

		const indexes = await Promise.all(
			packs.map((pack) => {
				return pack
					.getIndex({
						fields: ['name', 'img', 'type'].concat(fields),
					})
					.then((entries) => ({ pack, entries }));
			}),
		);

		for (const { pack, entries } of indexes) {
			for (const entry of entries) {
				const key = entry.type ?? 'unknown';
				if (type && key !== type) continue;

				this.patchEntryData(entry);

				(result[key] ??= []).push({
					...entry,
					pack: pack.collection,
					packageName: pack.metadata.packageName,
				});
			}
		}

		return result;
	}

	/**
	 * @desc Adds extra data to entries of specific data models to help with indexing.
	 * @param {CompendiumIndexEntry} entry
	 * @returns {*}
	 */
	patchEntryData(entry) {
		let _class;
		// TODO: Use lowercase?
		switch (entry.type) {
			case 'class':
				_class = entry.system.fuid;
				break;
			case 'skill':
			case 'heroic':
				{
					// Patch existing compendium skills to use fuid format
					if (entry.system?.class?.value) {
						let classes = entry.system.class.value.split(',');
						classes = classes.map((c) => StringUtils.titleToKebab(c));
						_class = classes.join(',');
					}
				}
				break;
		}
		switch (entry.system.featureType) {
			case 'projectfu.dance':
				_class = 'dancer';
				break;

			case 'projectfu.key':
			case 'projectfu.tone':
			case 'projectfu.verse':
				_class = 'chanter';
				break;

			case 'projectfu.symbol':
				_class = 'symbolist';
				break;

			case 'projectfu.therioform':
				_class = 'mutant';
				break;

			case 'projectfu.magitech':
			case 'projectfu.alchemy':
			case 'projectfu.infusions':
				_class = 'tinkerer';
				break;

			case 'projectfu.magiseed':
			case 'projectfu.garden':
				_class = 'floralist';
				break;

			case 'projectfu.ingredient':
			case 'projectfu.cookbook':
				_class = 'gourmet';
				break;

			case 'projectfu.arcanum':
				_class = 'arcanist';
				break;

			case 'projectfu.vehicle':
			case 'projectfu.armorModule':
			case 'projectfu.weaponModule':
			case 'projectfu.supportModule':
				_class = 'pilot';
				break;

			case 'projectfu.invocations':
				_class = 'invoker';
				break;

			case 'projectfu.psychicGift':
				_class = 'esper';
				break;
		}
		entry.metadata = {
			class: _class,
		};
		return entry;
	}

	/**
	 * @returns {Promise<EquipmentEntries>}
	 */
	async getEquipment() {
		const entries = {
			armor: await this.getItemsOfType('armor'),
			weapon: await this.getItemsOfType('weapon'),
			consumable: await this.getItemsOfType('consumable'),
			shield: await this.getItemsOfType('shield'),
			accessory: await this.getItemsOfType('accessory'),
		};
		return entries;
	}

	/**
	 * @returns {Promise<ClassEntries>}
	 */
	async getClasses() {
		let classes = await this.getItemsOfType('class');
		classes = classes.filter((c) => !c.name.toLowerCase().includes('legacy'));

		const entries = {
			class: classes,
			classFeature: await this.getItemsOfType('classFeature'),
		};
		return entries;
	}

	/**
	 * @returns {Promise<SkillEntries>}
	 */
	async getSkills() {
		const entries = {
			skill: await this.getItemsOfType('skill'),
			heroic: await this.getItemsOfType('heroic'),
		};
		return entries;
	}

	/**
	 * @returns {Promise<AbilityEntries>}
	 */
	async getAbilities() {
		const entries = {
			basic: await this.getItemsOfType('basic'),
			miscAbility: await this.getItemsOfType('miscAbility'),
			rule: await this.getItemsOfType('rule'),
		};
		return entries;
	}

	/**
	 * @returns {Promise<CharacterEntries>}
	 */
	async getCharacters() {
		const entries = {
			character: await this.getActorsOfType('character'),
			npc: await this.getActorsOfType('npc'),
			stash: await this.getActorsOfType('stash'),
		};
		return entries;
	}

	/**
	 * @desc Subscribes to various callbacks for indexing.
	 */
	static initialize() {
		Hooks.on('updateCompendium', async (pack, changes) => {
			// TODO: More granular update?
			CompendiumIndex.reinitialize();
		});
	}
}
