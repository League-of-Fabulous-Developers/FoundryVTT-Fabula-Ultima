import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on a {@linkcode CalculateDamageEvent}
 * @extends RuleTriggerDataModel
 * @property {Set<FUItemGroup>} itemGroups
 * @property {Set<DamageType>} damageTypes
 * @property {String} identifier
 * @property {Boolean} local
 * @inheritDoc
 */
export class CalculateDamageRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.CALCULATE_DAMAGE_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'calculateDamageRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			itemGroups: new fields.SetField(new fields.StringField()),
			damageTypes: new fields.SetField(new fields.StringField()),
			identifier: new fields.StringField(),
			local: new fields.BooleanField({ initial: false }),
		});
		return schema;
	}

	static migrateData(source) {
		if (source.damageSources) {
			source.itemGroups = source.damageSources;
			delete source.damageSources;
		}
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RuleTriggerCalculateDamage';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/calculate-damage-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<CalculateDamageEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.itemGroups.size > 0 && !this.itemGroups.has(context.event.itemGroup)) {
			return false;
		}
		if (this.damageTypes.size > 0 && !this.damageTypes.has(context.event.type)) {
			return false;
		}
		if (this.identifier) {
			if (!context.matchesItem(this.identifier)) {
				return false;
			}
		}
		if (this.local) {
			if (!context.isLocalItem()) {
				return false;
			}
		}
		return true;
	}
}
