import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { TraitsPredicateDataModel } from '../../items/common/traits-predicate-data-model.mjs';
import { FeatureTraits, TraitUtils } from '../../../pipelines/traits.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on an attack event
 * @extends RuleTriggerDataModel
 * @property {TraitsPredicateDataModel} traits
 * @inheritDoc
 */
export class FeatureRuleTrigger extends RuleTriggerDataModel {
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			traits: new fields.EmbeddedDataField(TraitsPredicateDataModel, {
				options: TraitUtils.getOptions(FeatureTraits),
			}),
		});
	}

	/**
	 * @inheritDoc
	 */
	static get eventType() {
		return FUHooks.FEATURE_EVENT;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RuleTriggerFeature';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/feature-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<FeatureEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		return this.traits.evaluate(context.event.traits);
	}
}
