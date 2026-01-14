import { CharacterMigrations } from './character-migrations.mjs';
import { BondDataModel } from '../common/bond-data-model.mjs';
import { CharacterSkillTracker } from './character-skill-tracker.mjs';
import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { PilotVehicleDataModel } from './pilot-vehicle-data-model.mjs';
import { SETTINGS } from '../../../settings.js';
import { FloralistDataModel } from './floralist-data-model.mjs';
import { EquipmentHandler } from '../../../helpers/equipment-handler.mjs';
import { BaseCharacterDataModel } from '../common/base-character-data-model.mjs';

const CLASS_HP_BENEFITS = 5;
const CLASS_MP_BENEFITS = 5;
const CLASS_IP_BENEFITS = 2;

/**
 * @class
 * @extends BaseCharacterDataModel
 * @property {AffinitiesDataModel} affinities
 * @property {AttributesDataModel} attributes
 * @property {DerivedValuesDataModel} derived
 * @property {BonusesDataModel} bonuses Flat amounts
 * @property {BonusesDataModel} multipliers Multiplies the base amount
 * @property {OverridesDataModel} overrides Overrides for default behaviour
 * @property {string} description
 * @property {number} level.value
 * @property {number} resources.hp.max
 * @property {number} resources.hp.value
 * @property {number} resources.hp.bonus
 * @property {number} resources.mp.max
 * @property {number} resources.mp.value
 * @property {number} resources.mp.bonus
 * @property {number} resources.zenit.value
 * @property {number} resources.ip.min
 * @property {number} resources.ip.max
 * @property {number} resources.ip.value
 * @property {number} resources.ip.bonus
 * @property {Object} resources.fp
 * @property {number} resources.fp.value
 * @property {number} resources.exp.value
 * @property {string} resources.identity.name
 * @property {string} resources.pronouns.name
 * @property {string} resources.theme.name
 * @property {string} resources.origin.name
 * @property {BondDataModel[]} bonds
 * @property {PilotVehicleDataModel} vehicle
 * @property {CharacterSkillTracker} tlTracker
 * @property {FloralistDataModel} floralist
 * @inheritDoc
 */
export class CharacterDataModel extends BaseCharacterDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, StringField, ArrayField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			level: new SchemaField({
				value: new NumberField({
					initial: 5,
					min: 5,
					max: 50,
					integer: true,
					nullable: false,
				}),
			}),
			resources: new SchemaField({
				hp: new SchemaField({
					value: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				mp: new SchemaField({
					value: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				zenit: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
				ip: new SchemaField({
					value: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				fp: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
				exp: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
				identity: new SchemaField({ name: new StringField() }),
				pronouns: new SchemaField({ name: new StringField() }),
				theme: new SchemaField({ name: new StringField() }),
				origin: new SchemaField({ name: new StringField() }),
			}),
			bonds: new ArrayField(new EmbeddedDataField(BondDataModel, {}), {
				validate: (value) => {
					const maxBonds = game.settings.get(SYSTEM, SETTINGS.optionBondMaxLength);
					if (value.length > maxBonds) {
						value.splice(maxBonds);
					}
				},
			}),
			vehicle: new EmbeddedDataField(PilotVehicleDataModel, {}),
			// TODO: Refactor
			floralist: new EmbeddedDataField(FloralistDataModel, {}),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source);
		CharacterMigrations.run(source);
		return source;
	}

	/**
	 * @override
	 */
	prepareBaseData() {
		this.resources.hp.attribute = 'mig';
		this.resources.mp.attribute = 'wlp';
		this.#prepareBasicResources();
		this.vehicle.prepareData();
		this.floralist.prepareData();
		this.derived.prepareData();
	}

	/**
	 * @override
	 */
	prepareDerivedData() {
		this.tlTracker = new CharacterSkillTracker(this);
		this.actor.equipmentHandler ??= new EquipmentHandler(this.actor);
	}

	#prepareBasicResources() {
		const data = this;

		const benefits = {};
		const initializeBenefits = (resource) => () => {
			const itemTypes = data.actor.itemTypes;

			const computed = itemTypes.class.reduce(
				(agg, curr) => {
					if (curr.system.benefits.resources.hp.value) {
						agg.hp += CLASS_HP_BENEFITS;
					}
					if (curr.system.benefits.resources.mp.value) {
						agg.mp += CLASS_MP_BENEFITS;
					}
					if (curr.system.benefits.resources.ip.value) {
						agg.ip += CLASS_IP_BENEFITS;
					}
					return agg;
				},
				{ hp: 0, mp: 0, ip: 0 },
			);

			benefits.hp = computed.hp;
			benefits.mp = computed.mp;
			benefits.ip = computed.ip;
			return benefits[resource];
		};

		const setBenefit = (resource) => (value) => {
			delete benefits[resource];
			benefits[resource] = value;
		};

		const benefitPropertyDescriptor = (resource) => ({
			configurable: true,
			get: initializeBenefits(resource),
			set: setBenefit(resource),
		});

		Object.defineProperties(benefits, {
			hp: benefitPropertyDescriptor('hp'),
			mp: benefitPropertyDescriptor('mp'),
			ip: benefitPropertyDescriptor('ip'),
		});

		// Calculate multipliers based on actor type and attributes.

		// Define maximum hit points (hp) calculation, replace calculation with actual value on write.
		Object.defineProperty(this.resources.hp, 'max', {
			configurable: true,
			enumerable: true,
			get() {
				const baseAttribute = Object.keys(FU.attributes).includes(this.attribute) ? data.attributes[this.attribute].base : data.attributes.mig.base;
				return baseAttribute * 5 + data.level.value + benefits.hp + this.bonus;
			},
			set(newValue) {
				delete this.max;
				this.max = newValue;
			},
		});

		Object.defineProperty(this.resources.hp, 'crisisScore', {
			configurable: true,
			enumerable: true,
			get() {
				const multiplier = game.settings.get(SYSTEM, SETTINGS.optionCrisisMultiplier) ?? 0.5;
				return Math.floor(this.max * multiplier);
			},
			set(newValue) {
				delete this.crisisScore;
				this.crisisScore = newValue;
			},
		});

		Object.defineProperty(this.resources.hp, 'inCrisis', {
			configurable: true,
			enumerable: true,
			get() {
				return this.value <= this.crisisScore;
			},
		});

		// Define maximum mind points (mp) calculation, replace calculation with actual value on write.
		Object.defineProperty(this.resources.mp, 'max', {
			configurable: true,
			enumerable: true,
			get() {
				const baseAttribute = Object.keys(FU.attributes).includes(this.attribute) ? data.attributes[this.attribute].base : data.attributes.wlp.base;
				return baseAttribute * 5 + data.level.value + benefits.mp + this.bonus;
			},
			set(newValue) {
				delete this.max;
				this.max = newValue;
			},
		});

		// Define maximum inventory points (ip) calculation, replace calculation with actual value on write.
		Object.defineProperty(this.resources.ip, 'max', {
			configurable: true,
			enumerable: true,
			get() {
				return 6 + benefits.ip + this.bonus;
			},
			set(newValue) {
				delete this.max;
				this.max = newValue;
			},
		});

		// Initialize fp and exp
		this.resources.fp.value = this.resources.fp.value || 0;
		this.resources.exp.value = this.resources.exp.value || 0;
	}
}
