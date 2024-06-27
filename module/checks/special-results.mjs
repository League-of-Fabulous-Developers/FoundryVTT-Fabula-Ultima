import { CheckHooks } from './check-hooks.mjs';
import { CHECK_RESULT } from './default-section-order.mjs';
import { CheckConfiguration } from './check-configuration.mjs';

const SKIP_RENDER = 'SpecialResultSkipRender';

/**
 * @param {CheckRenderData} sections
 * @param {CheckResultV2} check
 */
const onRenderCheck = (sections, check) => {
	if (check.type !== 'display' && !check.additionalData[SKIP_RENDER]) {
		const { critical, fumble, result } = check;
		const inspector = CheckConfiguration.inspect(check);
		sections.push({
			order: CHECK_RESULT,
			partial: 'systems/projectfu/templates/chat/partials/chat-check-result.hbs',
			data: {
				difficulty: inspector.getDifficulty(),
				result: {
					crit: critical,
					fumble: fumble,
					total: result,
				},
			},
		});
	}
};

/**
 * @param {Check | CheckResultV2} check
 */
const skipRender = (check) => {
	check.additionalData[SKIP_RENDER] = true;
};

const initialize = () => {
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const SpecialResults = Object.freeze({
	initialize,
	skipRender,
});
