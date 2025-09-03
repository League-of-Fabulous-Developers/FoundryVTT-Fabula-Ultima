import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on an attack event
 * @extends RuleTriggerDataModel
 * @inheritDoc
 * @property {FUCheckResult} result
 * @property {FUCheckOutcome} outcome
 */
export class AttackRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.ATTACK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'attackRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			result: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.checkResult) }),
			outcome: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.checkOutcome) }),
		});
		return schema;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RuleTriggerAttack';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/attack-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<AttackEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.result) {
			const a = this.result === 'even';
			const b = context.event.result % 2 === 0;
			if (a !== b) {
				return false;
			}
		}
		if (this.outcome) {
			for (const target of context.event.targets) {
				switch (target.data.result) {
					case 'hit':
						if (this.outcome !== 'success') {
							return false;
						}
						break;
					case 'miss':
						if (this.outcome !== 'failure') {
							return false;
						}
						break;
				}
			}
		}
		return true;
	}
}
