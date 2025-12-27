import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { Effects } from '../../../pipelines/effects.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

const fields = foundry.data.fields;
//const { DocumentUUIDField } =

/**
 * @property {String} effect The uuid of the effect
 */
export class ApplyEffectRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'applyEffectRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			effect: new fields.StringField({ nullable: true }),
			//effect: new DocumentUUIDField({ nullable: true, fieldType: 'ActiveEffect' }),
		});
	}

	static get localization() {
		return 'FU.RuleActionApplyEffect';
	}

	static get template() {
		return systemTemplatePath('effects/actions/apply-effect-rule-action');
	}

	async execute(context, selected) {
		if (!this.effect) {
			return;
		}

		// If there's a configuration provided
		if (context.event.config) {
			/** @type CheckConfigurer **/
			const config = context.event.config;
			config.addEffects(this.effect);
		} else {
			for (const sel of selected) {
				const instancedEffect = await Effects.instantiateEffect(this.effect);
				if (!instancedEffect) {
					return;
				}
				await Effects.promptApplyEffect(sel.actor, [instancedEffect], context.sourceInfo);
			}
		}
	}
}
