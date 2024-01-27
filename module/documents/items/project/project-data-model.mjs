export class ProjectDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new SchemaField({
				current: new NumberField({ initial: 0, integer: true }),
				step: new NumberField({ initial: 1, integer: true }),
				max: new NumberField({ initial: 6, integer: true }),
			}),
			potency: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'medium', 'major', 'extreme'] }) }),
			area: new SchemaField({ value: new StringField({ initial: 'individual', choices: ['individual', 'small', 'large', 'huge'] }) }),
			use: new SchemaField({ value: new StringField({ initial: 'consumable', choices: ['consumable', 'permanent'] }) }),
			isFlawed: new SchemaField({ value: new BooleanField() }),
			defectMod: new SchemaField({ value: new NumberField({ integer: true }) }),
			numTinker: new SchemaField({ value: new NumberField({ initial: 1, integer: true }) }),
			numHelper: new SchemaField({ value: new NumberField({ integer: true }) }),
			lvlVision: new SchemaField({ value: new NumberField({ min: 0, max: 5, integer: true }) }),
			cost: new SchemaField({ value: new NumberField() }),
			progressPerDay: new SchemaField({ value: new NumberField() }),
			days: new SchemaField({ value: new NumberField() }),
			discount: new SchemaField({ value: new NumberField() }),
			clock: new SchemaField({ value: new NumberField() }),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
