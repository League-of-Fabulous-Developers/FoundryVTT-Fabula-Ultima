import { LocallyEmbeddedDocumentField } from '../../items/classFeature/locally-embedded-document-field.mjs';
import { FUItem } from '../../items/item.mjs';
import { FUActor } from '../actor.mjs';
import { MnemosphereDataModel } from '../../items/mnemosphere/mnemosphere-data-model.mjs';
import { HoplosphereDataModel } from '../../items/hoplosphere/hoplosphere-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';

const slotsByQuality = {
	alpha: 1,
	beta: 2,
	gamma: 3,
	delta: 4,
};

const mnemospheresByQuality = {
	alpha: 1,
	beta: 1,
	gamma: 2,
	delta: 2,
};

class TechnosphereEquipmentDataModel extends foundry.abstract.DataModel {
	/**
	 * @returns {number}
	 */
	get totalSlots() {
		return slotsByQuality[this.slots];
	}

	/**
	 * @returns {number}
	 */
	get mnemosphereSlots() {
		return mnemospheresByQuality[this.slots];
	}

	/**
	 * @returns {number}
	 */
	get socketedTotal() {
		return this.socketed.map((item) => (item.system instanceof HoplosphereDataModel ? item.system.requiredSlots : 1)).reduce((prev, curr) => prev + curr, 0);
	}

	/**
	 *
	 * @returns {FUItem[]}
	 */
	get socketedMnemospheres() {
		return this.socketed.filter((item) => item.system instanceof MnemosphereDataModel).length;
	}
}

/**
 * @extends TechnosphereEquipmentDataModel
 * @property {"alpha", "beta", "gamma"} slots
 * @property {FUItem[]} socketed
 */
class TechnosphereArmorDataModel extends TechnosphereEquipmentDataModel {
	static defineSchema() {
		const { StringField, ArrayField } = foundry.data.fields;
		return {
			slots: new StringField({ initial: 'alpha', choices: Object.keys(FU.technospheres.armorSlots) }),
			socketed: new ArrayField(
				new LocallyEmbeddedDocumentField(FUItem, FUActor, {
					validate: (doc) => doc.system instanceof MnemosphereDataModel || doc.system instanceof HoplosphereDataModel,
				}),
				{},
			),
		};
	}
}

/**
 * @extends TechnosphereEquipmentDataModel
 * @property {"alpha", "beta", "gamma", "delta"} slots
 * @property {FUItem[]} socketed
 */
class TechnosphereWeaponDataModel extends TechnosphereEquipmentDataModel {
	static defineSchema() {
		const { StringField, ArrayField } = foundry.data.fields;
		return {
			slots: new StringField({ initial: 'alpha', choices: Object.keys(FU.technospheres.weaponSlots) }),
			socketed: new ArrayField(
				new LocallyEmbeddedDocumentField(FUItem, FUActor, {
					validate: (doc) => doc.system instanceof MnemosphereDataModel || doc.system instanceof HoplosphereDataModel,
				}),
				{},
			),
		};
	}
}

/**
 * @property {TechnosphereArmorDataModel} armor
 * @property {TechnosphereWeaponDataModel} weapon
 */
export class TechnosphereSocketsDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { EmbeddedDataField } = foundry.data.fields;
		return {
			armor: new EmbeddedDataField(TechnosphereArmorDataModel),
			weapon: new EmbeddedDataField(TechnosphereWeaponDataModel),
		};
	}

	prepareData() {
		this.armor.socketed = this.armor.socketed.map((value) => (value instanceof Function ? value() : value)).filter((value) => !!value);
		this.weapon.socketed = this.weapon.socketed.map((value) => (value instanceof Function ? value() : value)).filter((value) => !!value);
	}

	get totalSlots() {
		return this.armor.totalSlots + this.weapon.totalSlots;
	}

	get totalMnemosphereSlots() {
		return this.armor.mnemosphereSlots + this.weapon.mnemosphereSlots;
	}

	get allSocketed() {
		return [...this.armor.socketed, ...this.weapon.socketed];
	}

	get socketedMnemospheres() {
		return this.allSocketed.filter((item) => item.system instanceof MnemosphereDataModel);
	}

	get socketedHoplospheres() {
		return this.allSocketed.filter((item) => item.system instanceof MnemosphereDataModel);
	}

	/**
	 * @param {FUItem, MnemosphereDataModel, HoplosphereDataModel} technosphere
	 * @param {"armor", "weapon"} equipmentPiece
	 */
	socket(technosphere, equipmentPiece) {
		if (technosphere instanceof MnemosphereDataModel || technosphere instanceof HoplosphereDataModel) {
			technosphere = technosphere.parent;
		}

		const inArmor = this.armor.socketed.findSplice((item) => item === technosphere);
		const inWeapon = this.weapon.socketed.findSplice((item) => item === technosphere);

		if (equipmentPiece === 'armor' && !inArmor) {
			this.armor.socketed.push(technosphere);
		}
		if (equipmentPiece === 'weapon' && !inWeapon) {
			this.weapon.socketed.push(technosphere);
		}

		this.parent.parent.update({
			'system.technospheres.armor.socketed': this.armor.socketed.map((value) => value.id),
			'system.technospheres.weapon.socketed': this.weapon.socketed.map((value) => value.id),
		});
	}

	/**
	 * @param {FUItem, MnemosphereDataModel, HoplosphereDataModel} technosphere
	 * @return {"armor", "weapon", false}
	 */
	isSocketed(technosphere) {
		if (technosphere instanceof MnemosphereDataModel || technosphere instanceof HoplosphereDataModel) {
			technosphere = technosphere.parent;
		}
		if (this.armor.socketed.some((socketed) => socketed === technosphere)) {
			return 'armor';
		}
		if (this.weapon.socketed.some((socketed) => socketed === technosphere)) {
			return 'weapon';
		}
		return false;
	}
}
