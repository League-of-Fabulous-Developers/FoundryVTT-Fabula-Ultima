import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { Traits, TraitUtils } from '../../../pipelines/traits.mjs';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {TraitsDataModel} traits
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
			eventTypes: [FUHooks.PERFORM_CHECK_EVENT, FUHooks.CALCULATE_DAMAGE_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			traits: new fields.EmbeddedDataField(TraitsDataModel, {
				options: TraitUtils.getOptions(Traits),
			}),
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
		const values = this.traits.values;
		if (context.config) {
			switch (this.mode) {
				case 'add':
					context.config.addTraits(values);
					break;
				case 'remove':
					//context.config.removeTraits(values);
					break;
			}
		}
	}
}
