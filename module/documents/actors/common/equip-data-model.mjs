/**
 * @property {string} armor
 * @property {string} mainHand
 * @property {string} offHand
 * @property {string} accessory
 * @property {string} phantom
 * @property {string} arcanum
 */
export class EquipDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			armor: new StringField({ nullable: true }),
			mainHand: new StringField({ nullable: true }),
			offHand: new StringField({ nullable: true }),
			accessory: new StringField({ nullable: true }),
			phantom: new StringField({ nullable: true }),
			arcanum: new StringField({ nullable: true }),
		};
	}

	/**
	 * @param {FUItem} item
	 * @returns {boolean}
	 */
	isEquipped(item) {
		return item && Object.values(this).includes(item?.id);
	}

	/**
	 * @param {FUItem} item
	 * @returns {string}
	 */
	getClass(item) {
		if (!item || !item._id) {
			console.error('Item is missing.');
			return '';
		}

		const itemId = item._id;

		// Check if item is equipped in any slot
		const isEquipped = Object.values(this).includes(itemId);

		// Default icon if the item is not equipped
		if (!isEquipped) {
			return 'far fa-circle ra-1xh';
		}

		// Special case: if item is equipped in both mainHand and offHand
		if (itemId === this.mainHand && itemId === this.offHand) {
			return 'is-two-weapon equip ra-1xh';
		}
		// Special case: if shield is equipped in mainHand
		if (itemId === this.mainHand && item.type === 'shield') {
			return 'ra ra-heavy-shield ra-1xh';
		}
		// Special case: if item is in the phantom slot
		if (item.type === 'weapon' && itemId === this.phantom) {
			return 'ra ra-daggers ra-1xh';
		}
		if (item.type === 'weapon') {
			if (itemId === this.mainHand) {
				return 'ra ra-sword ra-1xh ra-flip-horizontal';
			} else if (itemId === this.offHand) {
				return 'ra ra-plain-dagger ra-1xh ra-rotate-180';
			}
		} else if (item.type === 'shield') {
			if (itemId === this.offHand) {
				return 'ra ra-shield ra-1xh';
			} else if (itemId === this.mainHand) {
				return 'ra ra-heavy-shield ra-1xh';
			}
		} else if (item.type === 'armor') {
			if (itemId === this.armor) {
				return 'ra ra-helmet ra-1xh';
			}
		} else if (item.type === 'accessory') {
			if (itemId === this.accessory) {
				return 'fas fa-leaf ra-1xh';
			}
		}

		return 'far fa-circle ra-1xh';
	}
}
