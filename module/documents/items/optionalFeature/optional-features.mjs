import { SYSTEM } from '../../../helpers/config.mjs';
import { QuirkDataModel } from './quirk/quirk-data-model.mjs';
import { ZeroPowerDataModel } from './zeropower/zeropower-data-model.mjs';
/**
 * Registers system-provided optional features.
 * @param {
 *
 * } registry
 */
export function registerOptionalFeatures(registry) {
	registry.register(SYSTEM, 'quirk', QuirkDataModel);
	registry.register(SYSTEM, 'zeroPower', ZeroPowerDataModel);
}
