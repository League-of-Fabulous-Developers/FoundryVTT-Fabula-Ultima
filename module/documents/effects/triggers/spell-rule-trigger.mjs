import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on a spell event
 * @extends RuleTriggerDataModel
 * @inheritDoc
 * @property {FUCheckResult} result
 * @property {Boolean} offensive
 */
export class SpellRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.SPELL_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'spellRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			offensive: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.booleanOption) }),
			duration: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.duration) }),
		});
		return schema;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RuleTriggerSpell';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/spell-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<SpellEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		const spell = context.event.spell;
		if (this.offensive && !spell.isOffensive.value) {
			return false;
		}
		if (this.duration && !spell.duration.value !== this.duration) {
			return false;
		}
		return true;
	}
}
