import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @inheritDoc
 * @property {Set<CheckType>} checkTypes
 * @property {Number} result
 */
export class ResolveCheckRuleTrigger extends RuleTriggerDataModel {
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			checkTypes: new fields.SetField(new fields.StringField({ choices: Object.keys(FU.checkTypes) })),
		});
	}

	/**
	 * @inheritDoc
	 */
	static get eventType() {
		return FUHooks.RESOLVE_CHECK_EVENT;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RuleTriggerResolveCheck';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/resolve-check-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<ResolveCheckEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		return this.checkTypes.has(context.event.check.type);
	}
}
