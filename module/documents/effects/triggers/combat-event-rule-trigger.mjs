import { FU } from '../../../helpers/config.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const { StringField } = foundry.data.fields;

/**
 * @description Trigger based on a combat event
 * @property {String} eventType
 */
export class CombatEventRuleTrigger extends RuleTriggerDataModel {
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
		});
	}

	static get localization() {
		return 'FU.RuleTriggerCombat';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/combat-rule-trigger');
	}

	validateContext(context) {
		if (context.event.type !== FU.combatEvent[this.eventType]) {
			return false;
		}
		switch (this.eventType) {
			case 'endOfTurn':
			case 'startOfTurn':
				return context.source.actor === context.event.actor;
			default:
				return true;
		}
	}
}
