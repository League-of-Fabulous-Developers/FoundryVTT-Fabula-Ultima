import { SYSTEM } from '../../../settings.js';
import { QuirkDataModel } from './quirk/quirk-data-model.mjs';

/**
 * Registers system-provided optional features.
 * @param {
 * 
 * } registry
 */
export function registerOptionalFeatures(registry) {
	registry.register(SYSTEM, 'quirk', QuirkDataModel);
}