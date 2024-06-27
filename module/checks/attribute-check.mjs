import { CheckHooks } from './check-hooks.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';
import { CheckConfiguration } from './check-configuration.mjs';

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} checkResult
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
const onRenderCheck = (data, checkResult, actor, item) => {
	const { type, primary, modifierTotal, secondary, result } = checkResult;
	if (type === 'attribute') {
		const inspector = CheckConfiguration.inspect(checkResult);
		data.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
			data: {
				result: {
					attr1: primary.result,
					attr2: secondary.result,
					modifier: modifierTotal,
					total: result,
				},
				check: {
					attr1: {
						attribute: primary.attribute,
					},
					attr2: {
						attribute: secondary.attribute,
					},
				},
				difficulty: inspector.getDifficulty(),
				modifiers: checkResult.modifiers,
			},
		});
	}
};

const initialize = () => {
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const AttributeCheck = Object.freeze({
	initialize,
});
