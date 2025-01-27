/**
 * @property {number} all
 * @property {number} melee
 * @property {number} ranged
 * @property {number} spell
 * @property {number} arcane
 * @property {number} bow
 * @property {number} brawling
 * @property {number} dagger
 * @property {number} firearm
 * @property {number} flail
 * @property {number} heavy
 * @property {number} spear
 * @property {number} sword
 * @property {number} thrown
 * @property {number} physical
 * @property {number} air
 * @property {number} bolt
 * @property {number} dark
 * @property {number} earth
 * @property {number} fire
 * @property {number} ice
 * @property {number} light
 * @property {number} poison
 */
export class DamageBonusesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			all: new NumberField({ initial: 0, integer: true, nullable: false }),

			melee: new NumberField({ initial: 0, integer: true, nullable: false }),
			ranged: new NumberField({ initial: 0, integer: true, nullable: false }),
			spell: new NumberField({ initial: 0, integer: true, nullable: false }),

			arcane: new NumberField({ initial: 0, integer: true, nullable: false }),
			bow: new NumberField({ initial: 0, integer: true, nullable: false }),
			brawling: new NumberField({ initial: 0, integer: true, nullable: false }),
			dagger: new NumberField({ initial: 0, integer: true, nullable: false }),
			firearm: new NumberField({ initial: 0, integer: true, nullable: false }),
			flail: new NumberField({ initial: 0, integer: true, nullable: false }),
			heavy: new NumberField({ initial: 0, integer: true, nullable: false }),
			spear: new NumberField({ initial: 0, integer: true, nullable: false }),
			sword: new NumberField({ initial: 0, integer: true, nullable: false }),
			thrown: new NumberField({ initial: 0, integer: true, nullable: false }),

			physical: new NumberField({ initial: 0, integer: true, nullable: false }),
			air: new NumberField({ initial: 0, integer: true, nullable: false }),
			bolt: new NumberField({ initial: 0, integer: true, nullable: false }),
			dark: new NumberField({ initial: 0, integer: true, nullable: false }),
			earth: new NumberField({ initial: 0, integer: true, nullable: false }),
			fire: new NumberField({ initial: 0, integer: true, nullable: false }),
			ice: new NumberField({ initial: 0, integer: true, nullable: false }),
			light: new NumberField({ initial: 0, integer: true, nullable: false }),
			poison: new NumberField({ initial: 0, integer: true, nullable: false }),
		};
	}
}
