import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { Effects } from '../../../pipelines/effects.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUCollectionRemovalRule} rule
 * @property {String} identifier The id of the effect to remove. If empty, it will clear all temporary effects.
 */
export class ClearEffectRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'clearEffectRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			rule: new fields.StringField({
				initial: 'single',
				choices: Object.keys(FU.collectionRemovalRule),
				required: true,
			}),
			identifier: new fields.StringField(),
		});
	}

	static get localization() {
		return 'FU.RuleActionClearEffect';
	}

	static get template() {
		return systemTemplatePath('effects/actions/clear-effect-rule-action');
	}

	async execute(context, selected) {
		for (const target of selected) {
			const actor = target.actor;
			switch (this.rule) {
				case 'single':
					{
						if (this.identifier) {
							const effect = actor.getEffect(this.identifier);
							if (effect) {
								effect.delete();
							}
						} else {
							await Effects.promptRemoveEffect(actor, context.label);
						}
					}
					break;

				case 'all':
					actor.clearTemporaryEffects(true, false);
					break;
			}
		}
	}
}
