import { CheckHooks } from './check-hooks.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';
import { SYSTEM } from '../helpers/config.mjs';

/**
 * @typedef TargetData
 * @property {string} name
 * @property {string} uuid
 * @property {string} link
 * @property {number} difficulty
 */

function handleGenericBonus(actor, modifiers) {
	if (actor.system.bonuses.accuracy.openCheck) {
		modifiers.push({
			label: 'FU.OpenCheck',
			value: actor.system.bonuses.accuracy.openCheck,
		});
	}
}

const critThresholdFlag = 'critThreshold.openCheck';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const onPrepareCheck = (check, actor, item, registerCallback) => {
	const { type, modifiers } = check;
	if (type === 'open') {
		handleGenericBonus(actor, modifiers);

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
				modifiers: checkResult.modifiers,
			},
		});
	}
};

const initialize = () => {
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const OpenCheck = Object.freeze({
	initialize,
});
