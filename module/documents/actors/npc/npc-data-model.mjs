import { FU } from '../../../helpers/config.mjs';
import { NpcMigrations } from './npc-migrations.mjs';
import { AffinitiesDataModel } from '../common/affinities-data-model.mjs';
import { AttributesDataModel } from '../common/attributes-data-model.mjs';
import { BonusesDataModel } from '../common/bonuses-data-model.mjs';
import { BondDataModel } from '../common/bond-data-model.mjs';
import { NpcSkillTracker } from './npc-skill-tracker.mjs';
import { DerivedValuesDataModel } from '../common/derived-values-data-model.mjs';

/**
 * @property {number} level.value
 * @property {number} resources.hp.max
 * @property {number} resources.hp.value
 * @property {number} resources.hp.bonus
 * @property {number} resources.mp.max
 * @property {number} resources.mp.value
 * @property {number} resources.mp.bonus
 * @property {string} resources.rp1.name
 * @property {number} resources.rp1.value
 * @property {string} resources.rp2.name
 * @property {number} resources.rp2.value
 * @property {string} resources.rp2.name
 * @property {number} resources.rp2.value
 * @property {number} resources.zenit.value
 * @property {number} resources.ip.max
 * @property {number} resources.ip.value
 * @property {number} resources.ip.bonus
 * @property {number} resources.fp.value
 * @property {string} resources.pronouns.name
 * @property {AffinitiesDataModel} affinities
 * @property {AttributesDataModel} attributes
 * @property {number} derived.init.value
 * @property {number} derived.init.bonus
 * @property {number} derived.def.value
 * @property {number} derived.def.bonus
 * @property {number} derived.mdef.value
 * @property {number} derived.mdef.bonus
 * @property {BonusesDataModel} bonuses
 * @property {string} traits.value
 * @property {'beast', 'construct', 'demon', 'elemental', 'humanoid', 'monster', 'plant', 'undead', 'custom'} species.value
 * @property {"", "minor", "major", "supreme"} villain.value
 * @property {number} phases.value
 * @property {string} multipart.value
 * @property {boolean} isElite.value
 * @property {number} isChampion.value
 * @property {boolean} isCompanion.value
 * @property {number} companion.playerLevel
 * @property {number} companion.skillLevel
 * @property {boolean} useEquipment.value
 * @property {number} study.value
 * @property {string} associatedTherioforms
 * @property {string} description
 * @property {NpcSkillTracker} spTracker
 */
export class NpcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, StringField, BooleanField, ArrayField, HTMLField, EmbeddedDataField } = foundry.data.fields;
		return {
			level: new SchemaField({ value: new NumberField({ initial: 5, min: 5, max: 60, integer: true, nullable: false }) }),
			resources: new SchemaField({
				hp: new SchemaField({
					value: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
				}),
				mp: new SchemaField({
					value: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
				}),
				rp1: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				rp2: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				rp3: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				zenit: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
				ip: new SchemaField({
					max: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
					value: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
				}),
				fp: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
				bonds: new ArrayField(new EmbeddedDataField(BondDataModel, {})),
				pronouns: new SchemaField({ name: new StringField() }),
			}),
			affinities: new EmbeddedDataField(AffinitiesDataModel, {}),
			attributes: new EmbeddedDataField(AttributesDataModel, {}),
			derived: new EmbeddedDataField(DerivedValuesDataModel, {}),
			bonuses: new EmbeddedDataField(BonusesDataModel, {}),
			traits: new SchemaField({ value: new StringField({ initial: '' }) }),
			species: new SchemaField({ value: new StringField({ initial: 'beast', choices: Object.keys(FU.species) }) }),
			villain: new SchemaField({ value: new StringField({ initial: '', blank: true, choices: Object.keys(FU.villainTypes) }) }),
			phases: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			multipart: new SchemaField({ value: new StringField({ initial: '' }) }),
			isElite: new SchemaField({ value: new BooleanField({ initial: false }) }),
			isChampion: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			isCompanion: new SchemaField({ value: new BooleanField({ initial: false }) }),
			companion: new SchemaField({
				playerLevel: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
				skillLevel: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
			}),
			useEquipment: new SchemaField({ value: new BooleanField({ initial: false }) }),
			study: new SchemaField({ value: new NumberField({ initial: 0, min: 0, max: 3, integer: true, nullable: false }) }),
			associatedTherioforms: new StringField(),
			description: new HTMLField(),
		};
	}

	static migrateData(source) {
		NpcMigrations.run(source);

		return source;
	}

	/**
	 * @return FUActor
	 */
	get actor() {
		return this.parent;
	}

	prepareBaseData() {}

	prepareDerivedData() {
		this.spTracker = new NpcSkillTracker(this);
	}

	prepareEmbeddedData() {
		this.#prepareBasicResource();
		this.derived.prepareData();
	}

	#prepareBasicResource() {
		// Calculate multipliers based on actor type and attributes.
		const data = this;

		// Define maximum hit points (hp) calculation, replace calculation with actual value on write.
		Object.defineProperty(this.resources.hp, 'max', {
			configurable: true,
			enumerable: true,
			get() {
				if (data.isCompanion.value) {
					// Companion calculation
					return Math.floor(data.attributes.mig.base * data.companion.skillLevel) + Math.floor(data.companion.playerLevel / 2 + data.resources.hp.bonus);
				}
				// Default calculation
				const hpMultiplier = data.isChampion.value !== 1 ? data.isChampion.value : data.isElite.value ? 2 : 1;
				return (data.attributes.mig.base * 5 + data.level.value * 2 + data.resources.hp.bonus) * hpMultiplier;
			},
			set(newValue) {
				delete this.max;
				this.max = newValue;
			},
		});

		// Define maximum mind points (mp) calculation, replace calculation with actual value on write.
		Object.defineProperty(this.resources.mp, 'max', {
			configurable: true,
			enumerable: true,
			get() {
				const mpMultiplier = data.isChampion.value !== 1 ? 2 : 1;
				return (data.attributes.wlp.base * 5 + data.level.value + data.resources.mp.bonus) * mpMultiplier;
			},
			set(newValue) {
				delete this.max;
				this.max = newValue;
			},
		});
	}
}
