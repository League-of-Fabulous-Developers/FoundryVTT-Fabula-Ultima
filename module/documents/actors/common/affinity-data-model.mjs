/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AffinityDataModel extends foundry.abstract.DataModel
{
    static defineSchema()
    {
        const {NumberField} = foundry.data.fields;
        return {
            base: new NumberField({min: -1, max: 4, initial: 0, integer: true, nullable: false}),
            current: new NumberField({min: -1, max: 4, initial: 0, integer: true, nullable: false}),
            bonus: new NumberField({min: -5, max: 5, initial: 0, integer: true, nullable: false}),
        };
    }
}