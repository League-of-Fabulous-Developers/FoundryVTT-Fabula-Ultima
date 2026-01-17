import { systemId } from '../../helpers/system-utils.mjs';

/**
 * @typedef EquipmentEntries
 * @property {CompendiumIndexEntry[]} armor
 * @property {CompendiumIndexEntry[]} weapon
 * @property {CompendiumIndexEntry[]} shield
 * @property {CompendiumIndexEntry[]} consumable
 */

/**
 * @typedef ClassesEntries
 * @property {CompendiumIndexEntry[]} class
 * @property {CompendiumIndexEntry[]} classFeature
 * @property {CompendiumIndexEntry[]} skill
 * @property {CompendiumIndexEntry[]} heroic
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

	static npcFields = ['system.species.value', 'system.rank.value', 'system.role.value'];
	static classFields = ['system.class.value', 'system.level.max'];
	static sharedItemFields = ['system.cost.value'];
	static spellFields = [`system.duration.value`, `system.cost.amount`];
	static weaponFields = [`system.damage.value`, `system.damageType.value`];
	static armorFields = [`system.def.attribute`, `system.def.value`, `system.mdef.attribute`, `system.mdef.value`];
	static consumableFields = [`system.ipCost.value`];
	static itemFields = [...this.sharedItemFields, ...this.spellFields, ...this.classFields, ...this.weaponFields, ...this.armorFields, ...this.consumableFields];

	/**
	 * @param {Boolean} force
	 * @returns {Record<string, CompendiumIndexEntry[]>}
	 */
	async getItems(force) {
		if (!this.#items || force) {
			this.#items = await this.getEntries('Item', null, CompendiumIndex.itemFields);
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
			this.#actors = await this.getEntries('Actor', null, CompendiumIndex.npcFields);
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
		};
		entries.all = Object.values(entries).flat();
		return entries;
	}

	/**
	 * @returns {Promise<ClassesEntries>}
	 */
	async getClasses() {
		const entries = {
			class: await this.getItemsOfType('class'),
			skill: await this.getItemsOfType('skill'),
			classFeature: await this.getItemsOfType('classFeature'),
			heroic: await this.getItemsOfType('heroic'),
		};
		entries.all = Object.values(entries).flat();
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
		entries.all = Object.values(entries).flat();
		return entries;
	}
}
