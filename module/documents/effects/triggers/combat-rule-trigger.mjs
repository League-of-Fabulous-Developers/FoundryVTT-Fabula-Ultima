import { FU } from '../../../helpers/config.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const { StringField } = foundry.data.fields;

/**
 * @description Trigger based on a combat event
 * @property {FUCombatEventType} eventType
 * @property {FUParity} parity
 */
export class CombatRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.COMBAT_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'combatRuleTrigger' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			eventType: new StringField({ initial: 'endOfTurn', choices: Object.keys(FU.combatEvent) }),
			parity: new StringField({ initial: '', blank: true, choices: Object.keys(FU.parity) }),
		});
	}

	static get localization() {
		return 'FU.RuleTriggerCombat';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/combat-rule-trigger');
	}

	/**
	 * @param{RuleElementContext<CombatEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (context.event.type !== FU.combatEvent[this.eventType]) {
			return false;
		}

		switch (this.eventType) {
			case 'startOfRound':
			case 'endOfRound':
				if (this.parity) {
					const a = this.parity === 'even';
					const b = context.event.round % 2 === 0;
					if (a !== b) {
						return false;
					}
				}
				break;

			case 'endOfTurn':
			case 'startOfTurn':
				if (context.source.actor !== context.event.actor) {
					return false;
				}
				break;
		}

		return true;
	}
}
