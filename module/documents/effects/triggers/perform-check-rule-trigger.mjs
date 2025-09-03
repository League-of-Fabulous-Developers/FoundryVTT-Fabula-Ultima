import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ItemAttributesDataModel } from '../../items/common/item-attributes-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @inheritDoc
 * @property {CheckType} checkType
 * @property {ItemAttributesDataModel} attributes
 */
export class PerformCheckRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.PERFORM_CHECK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'performCheckRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			checkType: new fields.StringField({ initial: 'accuracy', blank: true, choices: Object.keys(FU.checkTypes) }),
			attributes: new fields.EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: '' }, secondary: { value: '' } } }),
		});
		return schema;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RuleTriggerPerformCheck';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/perform-check-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<PerformCheckEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.checkType !== context.event.check.type) {
			return false;
		}

		// Check attributes in either order
		const a = [this.attributes.primary.value, this.attributes.secondary.value].filter(Boolean);
		const b = [context.event.check.primary, context.event.check.secondary];
		if (a.length === 0) return true;
		return a.every((v) => b.includes(v));
	}
}
