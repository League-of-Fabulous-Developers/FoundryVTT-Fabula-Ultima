import { systemId } from '../../helpers/system-utils.mjs';

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
	 * @type {Record<string, CompendiumIndexEntry[]>}
	 */
	#items;

	/**
	 * @type {Record<string, CompendiumIndexEntry[]>}
	 */
	#actors;

	// Actors
	static npcFields = ['system.species.value', 'system.rank.value', 'system.role.value'];
	static actorFields = [...this.npcFields];

	// TODO: Encode label, options data
	/**
	 * @desc The fields that are being indexed.
	 * @returns {Record<string, string>}
	 */
	static itemFields = Object.freeze({
		// Shared
		cost: 'system.cost.value',
		source: 'system.source',

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

	static #itemFieldsArray = Object.values(CompendiumIndex.itemFields);

	/**
	 * @param {Boolean} force
	 * @returns {Record<string, CompendiumIndexEntry[]>}
	 */
	async getItems(force) {
		if (!this.#items || force) {
			this.#items = await this.getEntries('Item', null, CompendiumIndex.#itemFieldsArray);
		}
		return this.#items;
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
	 * @returns {Record<string, CompendiumIndexEntry[]>}
	 */
	async getActors(force) {
		if (!this.#actors || force) {
			this.#actors = await this.getEntries('Actor', null, CompendiumIndex.actorFields);
		}
		return this.#actors;
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
		return game.packs.filter((p) => p.documentName === type);
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

				(result[key] ??= []).push({
					...entry,
					pack: pack.collection,
				});
			}
		}

		return result;
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
		const entries = {
			class: await this.getItemsOfType('class'),
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
}
