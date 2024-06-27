import { CheckHooks } from '../check-hooks.mjs';
import { SYSTEM } from '../../helpers/config.mjs';

const onRenderCheck = (sections, check, actor, item, flags) => {
	if (globalThis.AutoAnimations && item) {
		(flags[SYSTEM] ??= {})['itemId'] = item.id;
	}
};

const initialize = () => {
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const AutoAnimations = Object.freeze({
	initialize,
});
