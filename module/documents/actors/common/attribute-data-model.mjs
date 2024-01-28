/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AttributeDataModel extends foundry.abstract.DataModel
{
    static defineSchema()
    {
        const {NumberField} = foundry.data.fields;
        return {
            base: new NumberField({min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0, nullable: false}),
            current: new NumberField({
                min: 6,
                max: 12,
                initial: 8,
                integer: true,
                validate: (value) => value % 2 === 0
            }),
            bonus: new NumberField({min: -6, max: 6, initial: 0, integer: true, validate: (value) => value % 2 === 0, nullable: false}),
        };
    }
}