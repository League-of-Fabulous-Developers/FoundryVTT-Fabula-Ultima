import { FUItemSheet } from './item-sheet.mjs';

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
}
