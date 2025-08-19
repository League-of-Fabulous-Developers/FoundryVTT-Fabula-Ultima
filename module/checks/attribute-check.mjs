import { CheckHooks } from './check-hooks.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { SYSTEM } from '../helpers/config.mjs';

const critThresholdFlag = 'critThreshold.attributeCheck';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const onPrepareCheck = (check, actor) => {
	if (check.type === 'attribute') {
		const flag = actor.getFlag(SYSTEM, critThresholdFlag);
		if (flag) {
			check.critThreshold = Math.min(check.critThreshold, Number(flag));
		}
	}
};

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} checkResult
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
const onRenderCheck = (data, checkResult, actor, item) => {
	const { type, primary, modifierTotal, secondary, result, critical, fumble } = checkResult;
	if (type === 'attribute') {
		const inspector = CheckConfiguration.inspect(checkResult);
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
					crit: critical,
					fumble: fumble,
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
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const AttributeCheck = Object.freeze({
	initialize,
});
