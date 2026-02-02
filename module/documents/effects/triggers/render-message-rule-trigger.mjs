import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {Boolean} local
 * @inheritDoc
 */
export class RenderMessageRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.RENDER_MESSAGE_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'renderMessageRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			local: new fields.BooleanField({ initial: true }),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerRenderMessage';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/render-message-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<RenderMessageEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.local) {
			switch (context.event.document.documentName) {
				case 'ActiveEffect':
					if (context.event.document.uuid !== context.effect.uuid) {
						return false;
					}
					break;
				case 'Item':
					if (context.event.document.uuid !== context.item.uuid) {
						return false;
					}
					break;
			}
		}
		return true;
	}
}
