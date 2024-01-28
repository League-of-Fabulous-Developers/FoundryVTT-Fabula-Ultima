/**
 * @property {number} accuracyCheck
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
export class AccuracyBonusesDataModel extends foundry.abstract.DataModel
{
    static defineSchema()
    {
        const {NumberField} = foundry.data.fields;
        return {
            accuracyCheck: new NumberField({initial: 0, integer: true}),
            magicCheck: new NumberField({initial: 0, integer: true}),
            opposedCheck: new NumberField({initial: 0, integer: true}),
            openCheck: new NumberField({initial: 0, integer: true}),
            arcane: new NumberField({initial: 0, integer: true}),
            bow: new NumberField({initial: 0, integer: true}),
            brawling: new NumberField({initial: 0, integer: true}),
            dagger: new NumberField({initial: 0, integer: true}),
            firearm: new NumberField({initial: 0, integer: true}),
            flail: new NumberField({initial: 0, integer: true}),
            heavy: new NumberField({initial: 0, integer: true}),
            spear: new NumberField({initial: 0, integer: true}),
            sword: new NumberField({initial: 0, integer: true}),
            thrown: new NumberField({initial: 0, integer: true}),
        };
    }
}