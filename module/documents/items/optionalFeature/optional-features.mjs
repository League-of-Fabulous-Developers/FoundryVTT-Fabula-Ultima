import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { QuirkDataModel } from './quirk/quirk-data-model.mjs';
import { ZeroPowerDataModel } from './zeropower/zeropower-data-model.mjs';
import { CampActivityDataModel } from './camping/camp-activity-data-model.mjs';
import { SETTINGS } from '../../../settings.js';

/**
 * @description  system-provided optional features.
 * @param registry
 */
export function registerOptionalFeatures(registry) {
	if (game.settings.get(SYSTEM, SETTINGS.optionQuirks)) {
		FU.optionalFeatures.quirk = registry.register(SYSTEM, 'quirk', QuirkDataModel);
	}
	if (game.settings.get(SYSTEM, SETTINGS.optionZeroPower)) {
		FU.optionalFeatures.zeroPower = registry.register(SYSTEM, 'zeroPower', ZeroPowerDataModel);
	}
	if (game.settings.get(SYSTEM, SETTINGS.optionCampingRules)) {
		FU.optionalFeatures.campActivity = registry.register(SYSTEM, 'campActivity', CampActivityDataModel);
	}
}
