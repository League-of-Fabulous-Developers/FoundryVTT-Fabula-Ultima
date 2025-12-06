import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { Traits } from '../../../pipelines/traits.mjs';

const fields = foundry.data.fields;

/**
 * @property {Set<String>} traits
 * @property {FUChangeSetMode} mode
 */
export class ChangeTraitsRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'changeTraitsRuleAction' });
	}

	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.PERFORM_CHECK_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			traits: new fields.SetField(new fields.StringField()),
			mode: new fields.StringField({
				initial: 'add',
				choices: Object.keys(FU.changeSetMode),
				required: true,
			}),
		});
	}

	static get localization() {
		return 'FU.RuleActionChangeTraits';
	}

	static get template() {
		return systemTemplatePath('effects/actions/change-traits-rule-action');
	}

	async execute(context, selected) {
		const values = this.traits.map((t) => Traits[t]);
		if (context.type === FUHooks.CALCULATE_DAMAGE_EVENT) {
			/** @type CalculateDamageEvent **/
			const event = context.event;
			switch (this.mode) {
				case 'add':
					event.context.addTraits(values);
					break;
				case 'remove':
					event.context.removeTraits(values);
					break;
			}
		}
	}
}
