/**
 * @property {number} accuracyCheck
 * @property {number} accuracyMelee
 * @property {number} accuracyRanged
 * @property {number} magicCheck
 * @property {number} opposedCheck
 * @property {number} openCheck
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
 */
export class AccuracyBonusesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			accuracyCheck: new NumberField({ initial: 0, integer: true, nullable: false }),
			accuracyMelee: new NumberField({ initial: 0, integer: true, nullable: false }),
			accluracyRanged: new NumberField({ initial: 0, integer: true, nullable: false }),
			magicCheck: new NumberField({ initial: 0, integer: true, nullable: false }),
			opposedCheck: new NumberField({ initial: 0, integer: true, nullable: false }),
			openCheck: new NumberField({ initial: 0, integer: true, nullable: false }),
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
		};
	}
}
