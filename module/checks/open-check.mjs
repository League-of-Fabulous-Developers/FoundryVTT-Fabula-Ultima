import { CheckHooks } from './check-hooks.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';
/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} checkResult
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
const onRenderCheck = (data, checkResult, actor, item) => {
	const { type, primary, modifierTotal, secondary, result } = checkResult;
	if (type === 'open') {
		data.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
			data: {
				result: {
					attr1: primary.result,
					attr2: secondary.result,
					die1: primary.dice,
					die2: secondary.dice,
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
				modifiers: checkResult.modifiers,
			},
		});
	}
};

const initialize = () => {
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const OpenCheck = Object.freeze({
	initialize,
});
