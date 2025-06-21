import { SYSTEM } from '../../../helpers/config.mjs';
import { QuirkDataModel } from './quirk/quirk-data-model.mjs';
import { ZeroPowerDataModel } from './zeropower/zeropower-data-model.mjs';

/**
 * @description  system-provided optional features.
 * @param registry
 */
export function registerOptionalFeatures(registry) {
	registry.register(SYSTEM, QuirkDataModel.TYPE, QuirkDataModel);
	registry.register(SYSTEM, ZeroPowerDataModel.TYPE, ZeroPowerDataModel);
}
