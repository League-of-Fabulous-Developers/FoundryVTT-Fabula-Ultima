import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { NpcMigrations } from './npc-migrations.mjs';
import { NpcSkillTracker } from './npc-skill-tracker.mjs';
import { Role } from '../../../helpers/roles.mjs';
import { EquipmentHandler } from '../../../helpers/equipment-handler.mjs';
import { SETTINGS } from '../../../settings.js';
import { BaseCharacterDataModel } from '../common/base-character-data-model.mjs';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';
import { TraitUtils } from '../../../pipelines/traits.mjs';

Hooks.on('preUpdateActor', async (document, changed) => {
	if (document.system instanceof NpcDataModel) {
		const newVillainType = foundry.utils.getProperty(changed, 'system.villain.value');
		if (newVillainType !== undefined && newVillainType !== document.system.villain.value) {
			const ultimaPoints = {
				minor: 5,
				major: 10,
				supreme: 15,
			};

			foundry.utils.setProperty(changed, 'system.resources.fp.value', ultimaPoints[newVillainType] ?? 0);
		}

		// If role or level changed
		const newRole = foundry.utils.getProperty(changed, 'system.role.value');
		let roleChanged = newRole !== undefined && newRole !== document.system.role.value;
		const newLevel = foundry.utils.getProperty(changed, 'system.level.value');
		let levelChanged = newLevel !== undefined && newLevel !== document.system.level.value;
		if (roleChanged || levelChanged) {
			setRoleAttributes(document, newRole, newLevel);
		}
	}
});

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
 * @property {number} resources.ip.max
 * @property {number} resources.ip.value
 * @property {number} resources.ip.bonus
 * @property {number} resources.fp.value
 * @property {string} resources.pronouns.name
 * @property {number} derived.init.value
 * @property {number} derived.init.bonus
 * @property {number} derived.def.value
 * @property {number} derived.def.bonus
 * @property {number} derived.mdef.value
 * @property {number} derived.mdef.bonus
 * @property {string} traits.value
 * @property {'beast', 'construct', 'demon', 'elemental', 'humanoid', 'monster', 'plant', 'undead'} species.value
 * @property {"", "minor", "major", "supreme"} villain.value
 * @property {number} phases.value
 * @property {string} multipart.value
 * @property {"soldier", "elite", "champion", "companion", "custom"} rank.value
 * @property {RoleType} role.value
 * @property {number} rank.replacedSoldiers
 * @property {number} companion.playerLevel
 * @property {number} companion.skillLevel
 * @property {boolean} useEquipment.value
 * @property {number} study.value
 * @property {string} associatedTherioforms
 * @property {NpcSkillTracker} spTracker
 * @property {TraitsDataModel} pressurePoints
 */
export class NpcDataModel extends BaseCharacterDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, StringField, BooleanField, ForeignDocumentField, DocumentUUIDField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
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
				fp: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
				pronouns: new SchemaField({ name: new StringField() }),
			}),
			traits: new SchemaField({ value: new StringField({ initial: '' }) }),
			species: new SchemaField({ value: new StringField({ initial: 'beast', choices: Object.keys(FU.species) }) }),
			villain: new SchemaField({ value: new StringField({ initial: '', blank: true, choices: Object.keys(FU.villainTypes) }) }),
			phases: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			multipart: new SchemaField({ value: new StringField({ initial: '' }) }),
			rank: new SchemaField({
				value: new StringField({ initial: 'soldier', choices: Object.keys(FU.rank) }),
				replacedSoldiers: new NumberField({ initial: 1, min: 0, max: 6 }),
			}),
			role: new SchemaField({
				value: new StringField({ initial: 'custom', choices: Object.keys(FU.role) }),
			}),
			references: new SchemaField({
				actor: new ForeignDocumentField(Actor, { nullable: true }),
				skill: new DocumentUUIDField({ nullable: true, fieldType: 'Item' }),
			}),
			useEquipment: new SchemaField({ value: new BooleanField({ initial: false }) }),
			study: new SchemaField({ value: new NumberField({ initial: 0, min: 0, max: 3, integer: true, nullable: false }) }),
			associatedTherioforms: new StringField(),
			pressurePoints: new EmbeddedDataField(TraitsDataModel, {
				options: TraitUtils.getOptionsFromConfig(FU.weaponCategories),
			}),
			description: new HTMLField(),
		};
	}

	static migrateData(source) {
		source = super.migrateData(source);
		NpcMigrations.run(source);
		return source;
	}

	/**
	 * @override
	 */
	prepareBaseData() {
		this.#prepareReplacedSoldiers();
		this.#prepareBasicResource();
		this.derived.prepareData();
	}

	/**
	 * @override
	 */
	prepareDerivedData() {
		this.spTracker = new NpcSkillTracker(this);
		this.actor.equipmentHandler ??= new EquipmentHandler(this.actor);
	}

	#prepareReplacedSoldiers() {
		if (this.rank.value === 'companion') {
			this.rank.replacedSoldiers = 0;
		}
		if (this.rank.value === 'soldier') {
			this.rank.replacedSoldiers = 1;
		}
		if (this.rank.value === 'elite') {
			this.rank.replacedSoldiers = 2;
		}
		if (this.rank.value === 'custom') {
			this.rank.replacedSoldiers = 0;
		}
	}

	#prepareBasicResource() {
		// Calculate multipliers based on actor type and attributes.
		const data = this;

		// Define maximum hit points (hp) calculation, replace calculation with actual value on write.
		Object.defineProperty(this.resources.hp, 'max', {
			configurable: true,
			enumerable: true,
			get() {
				if (data.rank.value === 'companion') {
					const refActor = data.references.actor;
					const refSkill = data.references.skill ? fromUuidSync(data.references.skill) : null;
					const skillLevel = refSkill?.system?.level?.value ?? 0;
					return Math.floor(skillLevel * data.attributes.mig.base + (refActor?.system?.level.value ? refActor.system.level.value / 2 : 0) + (data.resources.hp.bonus ?? 0));
				}
				if (data.rank.value === 'custom') {
					return Math.floor(data.resources.hp.bonus);
				}
				// Default calculation
				const hpMultiplier = data.rank.replacedSoldiers;
				return (data.attributes.mig.base * 5 + data.level.value * 2 + data.resources.hp.bonus) * hpMultiplier;
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
				if (data.rank.value === 'custom') {
					return Math.floor(data.resources.mp.bonus);
				}
				const mpMultiplier = data.rank.value === 'champion' ? 2 : 1;
				return (data.attributes.wlp.base * 5 + data.level.value + data.resources.mp.bonus) * mpMultiplier;
			},
			set(newValue) {
				delete this.max;
				this.max = newValue;
			},
		});
	}
}

/**
 * Sets the NPC's attributes and bonuses based on its role if set
 * @param {FUStandardActorSheet} actor
 * @param {*} roleType
 * @returns
 */
async function setRoleAttributes(actor, newRole, newLevel) {
	const role = newRole ?? actor.system.role.value;

	// Do nothing if the role was set to custom
	if (role == 'custom') {
		return;
	}

	const level = newLevel ?? actor.system.level.value;
	console.info(`Setting attributes for role ${role} at level ${level}`);
	const updates = {};

	// Set accuracy/damage bonuses
	let accuracyBonus = Math.floor(level / 10);
	updates['system.bonuses.accuracy.accuracyCheck'] = accuracyBonus;
	updates['system.bonuses.accuracy.magicCheck'] = accuracyBonus;
	let damageBonus = Math.floor(level / 20) * 5;
	updates['system.bonuses.damage.melee'] = damageBonus;
	updates['system.bonuses.damage.ranged'] = damageBonus;
	updates['system.bonuses.damage.spell'] = damageBonus;

	// Set attributes
	let roleData = Role.resolve(role);
	let attributes = roleData.getAttributesForLevel(level);
	updates['system.attributes.dex.base'] = attributes.dex;
	updates['system.attributes.ins.base'] = attributes.ins;
	updates['system.attributes.mig.base'] = attributes.mig;
	updates['system.attributes.wlp.base'] = attributes.wlp;

	// TODO: Restore HP/MP to maximum

	if (Object.keys(updates).length > 0) {
		actor.update(updates);
	}
}
