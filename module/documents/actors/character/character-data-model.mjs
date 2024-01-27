import {CharacterMigrations} from './character-migrations.mjs';

export class CharacterDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, StringField, ArrayField } = foundry.data.fields;
		return {
			level: new SchemaField({ value: new NumberField({ min: 5, max: 60, initial: 5, integer: true }) }),
			resources: new SchemaField({
				hp: new SchemaField({
					min: new NumberField({ min: 0, initial: 0, integer: true }),
					max: new NumberField({ min: 0, initial: 10, integer: true }),
					value: new NumberField({ min: 0, initial: 10, integer: true }),
					bonus: new NumberField({ min: 0, initial: 0, integer: true }),
				}),
				mp: new SchemaField({
					min: new NumberField({ min: 0, initial: 0, integer: true }),
					max: new NumberField({ min: 0, initial: 10, integer: true }),
					value: new NumberField({ min: 0, initial: 10, integer: true }),
					bonus: new NumberField({ min: 0, initial: 0, integer: true }),
				}),
				rp1: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ min: 0, initial: 0, integer: true }),
				}),
				rp2: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ min: 0, initial: 0, integer: true }),
				}),
				rp3: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ min: 0, initial: 0, integer: true }),
				}),
				zenit: new SchemaField({ value: new NumberField({ min: 0, initial: 0, integer: true }) }),
				ip: new SchemaField({
					min: new NumberField({ min: 0, initial: 0, integer: true }),
					max: new NumberField({ min: 0, initial: 6, integer: true }),
					value: new NumberField({ min: 0, initial: 6, integer: true }),
					bonus: new NumberField({ min: 0, initial: 0, integer: true }),
				}),
				fp: new SchemaField({ value: new NumberField({ min: 0, initial: 3, integer: true }) }),
				bonds: new ArrayField(
					new SchemaField({
						name: new StringField({ initial: '' }),
						admInf: new StringField({ initial: '', blank: true, choices: ['Admiration', 'Inferiority'] }),
						loyMis: new StringField({ initial: '', blank: true, choices: ['Loyalty', 'Mistrust'] }),
						affHat: new StringField({ initial: '', blank: true, choices: ['Affection', 'Hatred'] }),
						strength: new NumberField({ min: 0, max: 4, initial: 0 }),
					}),
				),
				exp: new SchemaField({ value: new NumberField({ min: 0, integer: true }) }),
				identity: new SchemaField({ name: new StringField() }),
				pronouns: new SchemaField({ name: new StringField() }),
				theme: new SchemaField({ name: new StringField() }),
				origin: new SchemaField({ name: new StringField() }),
			}),
			affinities: new SchemaField({
				phys: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				air: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				bolt: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				dark: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				earth: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				fire: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				ice: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				light: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
				poison: new SchemaField({
					base: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					current: new NumberField({ min: -1, max: 4, initial: 0, integer: true }),
					bonus: new NumberField({ min: -5, max: 5, initial: 0, integer: true }),
				}),
			}),
			attributes: new SchemaField({
				dex: new SchemaField({
					base: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					current: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					bonus: new NumberField({ min: -6, max: 6, initial: 0, integer: true, validate: (value) => value % 2 === 0 }),
				}),
				ins: new SchemaField({
					base: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					current: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					bonus: new NumberField({ min: -6, max: 6, initial: 0, integer: true, validate: (value) => value % 2 === 0 }),
				}),
				mig: new SchemaField({
					base: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					current: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					bonus: new NumberField({ min: -6, max: 6, initial: 0, integer: true, validate: (value) => value % 2 === 0 }),
				}),
				wlp: new SchemaField({
					base: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					current: new NumberField({ min: 6, max: 12, initial: 8, integer: true, validate: (value) => value % 2 === 0 }),
					bonus: new NumberField({ min: -6, max: 6, initial: 0, integer: true, validate: (value) => value % 2 === 0 }),
				}),
			}),
			derived: new SchemaField({
				init: new SchemaField({
					value: new NumberField({ min: 0, initial: 0, integer: true }),
					bonus: new NumberField({ initial: 0, integer: true }),
				}),
				def: new SchemaField({
					value: new NumberField({ min: 0, initial: 0, integer: true }),
					bonus: new NumberField({ initial: 0, integer: true }),
				}),
				mdef: new SchemaField({
					value: new NumberField({ min: 0, initial: 0, integer: true }),
					bonus: new NumberField({ initial: 0, integer: true }),
				}),
			}),
			bonuses: new SchemaField({
				accuracy: new SchemaField({
					accuracyCheck: new NumberField({ initial: 0, integer: true }),
					magicCheck: new NumberField({ initial: 0, integer: true }),
					opposedCheck: new NumberField({ initial: 0, integer: true }),
					openCheck: new NumberField({ initial: 0, integer: true }),
					arcane: new NumberField({ initial: 0, integer: true }),
					bow: new NumberField({ initial: 0, integer: true }),
					brawling: new NumberField({ initial: 0, integer: true }),
					dagger: new NumberField({ initial: 0, integer: true }),
					firearm: new NumberField({ initial: 0, integer: true }),
					flail: new NumberField({ initial: 0, integer: true }),
					heavy: new NumberField({ initial: 0, integer: true }),
					spear: new NumberField({ initial: 0, integer: true }),
					sword: new NumberField({ initial: 0, integer: true }),
					thrown: new NumberField({ initial: 0, integer: true }),
				}),
				damage: new SchemaField({
					physical: new NumberField({ initial: 0, integer: true }),
					magic: new NumberField({ initial: 0, integer: true }),
					arcane: new NumberField({ initial: 0, integer: true }),
					bow: new NumberField({ initial: 0, integer: true }),
					brawling: new NumberField({ initial: 0, integer: true }),
					dagger: new NumberField({ initial: 0, integer: true }),
					firearm: new NumberField({ initial: 0, integer: true }),
					flail: new NumberField({ initial: 0, integer: true }),
					heavy: new NumberField({ initial: 0, integer: true }),
					spear: new NumberField({ initial: 0, integer: true }),
					sword: new NumberField({ initial: 0, integer: true }),
					thrown: new NumberField({ initial: 0, integer: true }),
				}),
			}),
		};
	}

	static migrateData(source) {
		CharacterMigrations.run(source);

		return source;
	}
}
