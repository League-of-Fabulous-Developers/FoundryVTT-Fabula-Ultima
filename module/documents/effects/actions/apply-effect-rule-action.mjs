import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FUItem } from '../../items/item.mjs';
import { Effects } from '../../../pipelines/effects.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

const { DocumentUUIDField } = foundry.data.fields;

/**
 * @property {String} effect The uuid of the effect
 */
export class ApplyEffectRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'applyEffectRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			effect: new DocumentUUIDField({ nullable: true, fieldType: 'ActiveEffect' }),
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
		let instancedEffect = await fromUuid(this.effect);
		if (instancedEffect instanceof FUItem) {
			instancedEffect = instancedEffect.effects.entries().next().value[1];
		}
		for (const sel of selected) {
			await Effects.promptApplyEffect(sel.actor, [instancedEffect], context.label);
		}
	}
}
