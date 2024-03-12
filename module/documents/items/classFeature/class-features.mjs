import { SYSTEM } from '../../../settings.js';
import { ArcanumDataModel } from './arcanist/arcanum-data-model.mjs';
import { AlchemyDataModel } from './tinkerer/alchemy-data-model.mjs';
import { MagitechDataModel } from './tinkerer/magitech-data-model.mjs';
import { InfusionsDataModel } from './tinkerer/infusion-data-model.mjs';
import { KeyDataModel } from './chanter/key-data-model.mjs';
import { ToneDataModel } from './chanter/tone-data-model.mjs';
import { VerseDataModel } from './chanter/verse-data-model.mjs';
import { DanceDataModel } from './dancer/dance-data-model.mjs';
import { SymbolDataModel } from './symbolist/symbol-data-model.mjs';

/**
 * Registers system-provided class features.
 * @param {ClassFeatureRegistry} registry
 */
export function registerClassFeatures(registry) {
	registry.register(SYSTEM, 'arcanum', ArcanumDataModel);
	registry.register(SYSTEM, 'alchemy', AlchemyDataModel);
	registry.register(SYSTEM, 'magitech', MagitechDataModel);
	registry.register(SYSTEM, 'infusions', InfusionsDataModel);
	registry.register(SYSTEM, 'key', KeyDataModel);
	registry.register(SYSTEM, 'tone', ToneDataModel);
	registry.register(SYSTEM, 'verse', VerseDataModel);
	registry.register(SYSTEM, 'dance', DanceDataModel);
	registry.register(SYSTEM, 'symbol', SymbolDataModel);
}
