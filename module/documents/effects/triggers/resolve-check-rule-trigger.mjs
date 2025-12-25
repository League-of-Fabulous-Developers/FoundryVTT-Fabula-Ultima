import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ItemAttributesDataModel } from '../../items/common/item-attributes-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @inheritDoc
 * @property {Set<CheckType>} checkTypes
 * @property {ItemAttributesDataModel} attributes
 * @property {Number} result
 */
export class ResolveCheckRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.RESOLVE_CHECK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'resolveCheckRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			checkTypes: new fields.SetField(new fields.StringField()),
			attributes: new fields.EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: '' }, secondary: { value: '' } } }),
			result: new fields.NumberField({ initial: 0, integer: true }),
		});
		return schema;
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
		if (!this.checkTypes.has(context.event.result.type)) {
			return false;
		}

		const a = [this.attributes.primary.value, this.attributes.secondary.value].filter(Boolean);
		const b = [context.event.result.primary, context.event.result.secondary];
		if (a.length > 0) {
			if (!a.every((v) => b.includes(v))) {
				return false;
			}
		}

		if (this.result > 0 && context.event.result.result <= this.result) {
			return false;
		}

		return true;
	}
}
