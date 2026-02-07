import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {String} identifier The id of an Item to match.
 * @property {Set<CheckType>} checkTypes
 * @property {Set<FUItemGroup>} itemGroups
 * @property {Boolean} local
 * @inheritDoc
 */
export class RenderCheckRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.RENDER_CHECK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'renderCheckRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			checkTypes: new fields.SetField(new fields.StringField()),
			itemGroups: new fields.SetField(new fields.StringField()),
			identifier: new fields.StringField(),
			local: new fields.BooleanField({ initial: true }),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerRenderCheck';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/render-check-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<RenderCheckEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.itemGroups.size > 0) {
			if (!this.itemGroups.has(context.event.itemGroup)) {
				return false;
			}
		}

		// Validate check types
		/** @type {CheckType} **/
		const checkType = context.event.config.check.type;
		if (this.checkTypes.size > 0 && !this.checkTypes.has(checkType)) {
			return false;
		}

		// If this RE is on an item, and it doesn't match the item in the event.
		if (this.local && context.item) {
			if (context.event.sourceInfo.itemUuid !== context.sourceInfo.itemUuid) {
				return false;
			}
		}

		if (this.identifier) {
			return context.matchesItem(this.identifier);
		}
		return true;
	}
}
