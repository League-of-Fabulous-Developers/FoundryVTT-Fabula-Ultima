import { systemId } from '../../helpers/system-utils.mjs';

/**
 * @typedef EquipmentEntries
 * @property {CompendiumIndexEntry[]} armor
 * @property {CompendiumIndexEntry[]} weapon
 * @property {CompendiumIndexEntry[]} shield
 * @property {CompendiumIndexEntry[]} consumable
 */

/**
 * @property {CompendiumIndexEntry[]} actors
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
	 * @param {Boolean} force
	 * @returns {Record<string, CompendiumIndexEntry[]>}
	 */
	async getItems(force) {
		if (!this.#items || force) {
			this.#items = await this.getEntries('Item');
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
		const items = await this.getItems(force);
		if (items[type]) {
			return items[type];
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
	 * @param {string} document Document type (e.g. "Item")
	 * @param {string} type The document subtype. (Such as what type of items like armor, weapons)
	 * @returns {Promise<Record<string, CompendiumIndexEntry[]>>}
	 */
	async getEntries(document, type) {
		/** @type {Record<string, CompendiumIndexEntry[]>} */
		const result = {};
		const packs = this.getSystemPacks(document);

		for (const pack of packs) {
			const entries = await pack.getIndex({
				fields: ['name', 'img', 'type'],
			});

			for (const entry of entries) {
				const key = entry.type ?? 'unknown';
				if (type && key !== type) {
					continue;
				}

				(result[key] ??= []).push({
					uuid: entry.uuid,
					name: entry.name,
					img: entry.img,
					type: entry.type,
					pack: pack.collection,
					system: entry.system,
				});
			}
		}

		return result;
	}

	/**
	 *
	 * @returns {Promise<EquipmentEntries>}
	 */
	async getEquipment() {
		const equipment = {
			armor: await this.getItemsOfType('armor'),
			weapon: await this.getItemsOfType('weapon'),
			consumable: await this.getItemsOfType('consumable'),
			shield: await this.getItemsOfType('shield'),
		};
		equipment.all = Object.values(equipment).flat();
		return equipment;
	}
}
