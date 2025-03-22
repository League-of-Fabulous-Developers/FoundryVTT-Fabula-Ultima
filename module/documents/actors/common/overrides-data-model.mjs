import { FU } from '../../../helpers/config.mjs';

/**
 * @property {DamageTypeOverrideDataModel} damageType.all
 * @property {DamageTypeOverrideDataModel} damageType.attack
 * @property {DamageTypeOverrideDataModel} damageType.spell
 * @property {DamageTypeOverrideDataModel} damageType.skill
 */
export class OverridesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { SchemaField, EmbeddedDataField } = foundry.data.fields;
		return {
			damageType: new SchemaField({
				all: new EmbeddedDataField(DamageTypeOverrideDataModel, {}),
				attack: new EmbeddedDataField(DamageTypeOverrideDataModel, {}),
				spell: new EmbeddedDataField(DamageTypeOverrideDataModel, {}),
				skill: new EmbeddedDataField(DamageTypeOverrideDataModel, {}),
			}),
		};
	}
}

/**
 * @description An override for damage, with support for prioritization
 * @property {String} normal
 * @property {String} priority
 */
export class DamageTypeOverrideDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			normal: new StringField({ initial: '', choices: Object.keys(FU.damageTypes), blank: true, nullable: false }),
			priority: new StringField({ initial: '', choices: Object.keys(FU.damageTypes), blank: true, nullable: false }),
		};
	}

	/**
	 * @returns {String} An override if present
	 */
	resolve() {
		if (this.priority) {
			return this.priority;
		}
		if (this.normal) {
			return this.normal;
		}
		return null;
	}
}
