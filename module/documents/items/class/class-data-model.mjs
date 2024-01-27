import {ClassMigrations} from './class-migrations.mjs';

export class ClassDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			level: new SchemaField({
				value: new NumberField({ initial: 1 }),
				max: new NumberField({ initial: 10 }),
				min: new NumberField({ initial: 0 }),
			}),
			benefits: new SchemaField({
				resources: new SchemaField({
					hp: new SchemaField({ value: new BooleanField() }),
					mp: new SchemaField({ value: new BooleanField() }),
					ip: new SchemaField({ value: new BooleanField() }),
				}),
				martials: new SchemaField({
					melee: new SchemaField({ value: new BooleanField() }),
					ranged: new SchemaField({ value: new BooleanField() }),
					armor: new SchemaField({ value: new BooleanField() }),
					shields: new SchemaField({ value: new BooleanField() }),
				}),
				rituals: new SchemaField({
					arcanism: new SchemaField({ value: new BooleanField() }),
					chimerism: new SchemaField({ value: new BooleanField() }),
					elementalism: new SchemaField({ value: new BooleanField() }),
					entropism: new SchemaField({ value: new BooleanField() }),
					ritualism: new SchemaField({ value: new BooleanField() }),
					spiritism: new SchemaField({ value: new BooleanField() }),
				}),
			}),
			source: new SchemaField({ value: new StringField() }),
		};
	}

	static migrateData(source) {
		ClassMigrations.run(source);
		return source;
	}
}
