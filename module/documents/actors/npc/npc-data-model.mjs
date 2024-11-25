import { FU } from '../../../helpers/config.mjs';
import { NpcMigrations } from './npc-migrations.mjs';
import { AffinitiesDataModel } from '../common/affinities-data-model.mjs';
import { AttributesDataModel } from '../common/attributes-data-model.mjs';
import { BonusesDataModel } from '../common/bonuses-data-model.mjs';
import { ImmunitiesDataModel } from '../common/immunities-data-model.mjs';
import { NpcSkillTracker } from './npc-skill-tracker.mjs';
import { EquipDataModel } from '../common/equip-data-model.mjs';
import { DerivedValuesDataModel } from '../common/derived-values-data-model.mjs';
import { Role } from '../../../helpers/roles.mjs';

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
 * @property {'beast', 'construct', 'demon', 'elemental', 'humanoid', 'monster', 'plant', 'undead'} species.value
 * @property {"", "minor", "major", "supreme"} villain.value
 * @property {number} phases.value
 * @property {string} multipart.value
 * @property {"soldier", "elite", "champion", "companion"} rank.value
 * @property {RoleType} role.value
 * @property {number} rank.replacedSoldiers
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
		const { SchemaField, NumberField, StringField, BooleanField, HTMLField, EmbeddedDataField } = foundry.data.fields;
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
				fp: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
				pronouns: new SchemaField({ name: new StringField() }),
			}),
			affinities: new EmbeddedDataField(AffinitiesDataModel, {}),
			attributes: new EmbeddedDataField(AttributesDataModel, {}),
			derived: new EmbeddedDataField(DerivedValuesDataModel, {}),
			equipped: new EmbeddedDataField(EquipDataModel, {}),
			bonuses: new EmbeddedDataField(BonusesDataModel, {}),
			immunities: new EmbeddedDataField(ImmunitiesDataModel, {}),
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

	prepareBaseData() {
		this.#prepareReplacedSoldiers();
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
	}

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
				if (data.rank.value === 'companion') {
					// Companion calculation
					return Math.floor(data.attributes.mig.base * data.companion.skillLevel) + Math.floor(data.companion.playerLevel / 2 + data.resources.hp.bonus);
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

		// Define maximum mind points (mp) calculation, replace calculation with actual value on write.
		Object.defineProperty(this.resources.mp, 'max', {
			configurable: true,
			enumerable: true,
			get() {
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
	const level = newLevel ?? actor.system.level.value;

	// Do nothing if the role was set to custom
	if (role == 'custom') {
		return;
	}

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

	// Restore HP/MP
	const maxHP = actor.system.resources.hp?.max;
	const maxMP = actor.system.resources.mp?.max;
	updates['system.resources.hp.value'] = maxHP;
	updates['system.resources.mp.value'] = maxMP;

	if (Object.keys(updates).length > 0) {
		actor.update(updates);
	}
}
