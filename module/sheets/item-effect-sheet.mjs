import { FUItemSheet } from './item-sheet.mjs';
import { ActiveEffectsTableRenderer } from '../helpers/tables/active-effects-table-renderer.mjs';

export class FUEffectItemSheet extends FUItemSheet {
	/** @override
	 * @type Record<ApplicationTab>
	 * */
	static TABS = {
		primary: {
			tabs: [{ id: 'effects', label: 'FU.Effects', icon: 'ra ra-hand' }],
			initial: 'effects',
		},
	};

	static PARTS = (() => {
		const parts = { ...super.PARTS };
		delete parts.tabs;
		return parts;
	})();

	_createEffectTableRenderer(effectState) {
		return new ActiveEffectsTableRenderer(effectState, { advancedConfig: { draggable: true } });
	}
}
