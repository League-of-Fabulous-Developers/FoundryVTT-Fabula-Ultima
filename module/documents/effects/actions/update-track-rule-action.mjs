import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ProgressDataModel } from '../../items/common/progress-data-model.mjs';

const fields = foundry.data.fields;
/**
 * @property {FUTrackAction} action
 * @property {String} identifier
 * @property {String} amount
 * @property {Boolean} notify
 */
export class UpdateTrackRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'updateTrackRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			action: new fields.StringField({
				initial: 'update',
				choices: Object.keys(FU.trackAction),
				required: true,
			}),
			identifier: new fields.StringField(),
			notify: new fields.BooleanField(),
			value: new fields.StringField({ blank: true }),
		});
	}

	static get localization() {
		return 'FU.RuleActionUpdateTrack';
	}

	static get template() {
		return systemTemplatePath('effects/actions/update-track-rule-action');
	}

	async execute(context, selected) {
		for (const character of selected) {
			const actor = character.actor;
			let id = this.identifier;
			if (!id) {
				id = context.effect.system.rules.progress.id;
			}
			let step;
			const progress = await actor.resolveProgress(id);

			switch (this.action) {
				case 'update':
					{
						const targets = selected.map((t) => t.actor);
						const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
						step = await Expressions.evaluateAsync(this.amount, expressionContext);
					}

					break;
				case 'reset':
					step = -progress.current;
					break;
			}

			if (step === 0) {
				return;
			}

			await actor.updateProgress(id, step);
			if (this.notify) {
				await ProgressDataModel.notifyUpdate(actor, progress, step, context.item);
			}
		}
	}
}
