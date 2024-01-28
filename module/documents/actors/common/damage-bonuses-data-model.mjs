/**
 * @property {number} physical
 * @property {number} magic
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
export class DamageBonusesDataModel extends foundry.abstract.DataModel
{
    static defineSchema()
    {
        const {NumberField} = foundry.data.fields;
        return {
            physical: new NumberField({initial: 0, integer: true}),
            magic: new NumberField({initial: 0, integer: true}),
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