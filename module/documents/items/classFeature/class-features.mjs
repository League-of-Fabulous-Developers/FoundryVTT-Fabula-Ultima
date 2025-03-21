import { ArcanumDataModel } from './arcanist/arcanum-data-model.mjs';
import { AlchemyDataModel } from './tinkerer/alchemy-data-model.mjs';
import { MagitechDataModel } from './tinkerer/magitech-data-model.mjs';
import { InfusionsDataModel } from './tinkerer/infusion-data-model.mjs';
import { KeyDataModel } from './chanter/key-data-model.mjs';
import { ToneDataModel } from './chanter/tone-data-model.mjs';
import { VerseDataModel } from './chanter/verse-data-model.mjs';
import { DanceDataModel } from './dancer/dance-data-model.mjs';
import { SymbolDataModel } from './symbolist/symbol-data-model.mjs';
import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { PsychicGiftDataModel } from './esper/psychic-gift-data-model.mjs';
import { TherioformDataModel } from './mutant/therioform-data-model.mjs';
import { VehicleDataModel } from './pilot/vehicle-data-model.mjs';
import { ArmorModuleDataModel } from './pilot/armor-module-data-model.mjs';
import { WeaponModuleDataModel } from './pilot/weapon-module-data-model.mjs';
import { SupportModuleDataModel } from './pilot/support-module-data-model.mjs';
import { MagiseedDataModel } from './floralist/magiseed-data-model.mjs';
import { IngredientDataModel } from './gourmet/ingredient-data-model.mjs';
import { CookbookDataModel } from './gourmet/cookbook-data-model.mjs';

/**
 * Registers system-provided class features.
 * @param {ClassFeatureRegistry} registry
 */
export function registerClassFeatures(registry) {
	FU.classFeatures.arcanum = registry.register(SYSTEM, 'arcanum', ArcanumDataModel);
	FU.classFeatures.alchemy = registry.register(SYSTEM, 'alchemy', AlchemyDataModel);
	FU.classFeatures.magitech = registry.register(SYSTEM, 'magitech', MagitechDataModel);
	FU.classFeatures.infusions = registry.register(SYSTEM, 'infusions', InfusionsDataModel);
	FU.classFeatures.key = registry.register(SYSTEM, 'key', KeyDataModel);
	FU.classFeatures.tone = registry.register(SYSTEM, 'tone', ToneDataModel);
	FU.classFeatures.verse = registry.register(SYSTEM, 'verse', VerseDataModel);
	FU.classFeatures.dance = registry.register(SYSTEM, 'dance', DanceDataModel);
	FU.classFeatures.symbol = registry.register(SYSTEM, 'symbol', SymbolDataModel);
	FU.classFeatures.psychicGift = registry.register(SYSTEM, 'psychicGift', PsychicGiftDataModel);
	FU.classFeatures.therioform = registry.register(SYSTEM, 'therioform', TherioformDataModel);
	FU.classFeatures.vehicle = registry.register(SYSTEM, 'vehicle', VehicleDataModel);
	FU.classFeatures.armorModule = registry.register(SYSTEM, 'armorModule', ArmorModuleDataModel);
	FU.classFeatures.weaponModule = registry.register(SYSTEM, 'weaponModule', WeaponModuleDataModel);
	FU.classFeatures.supportModule = registry.register(SYSTEM, 'supportModule', SupportModuleDataModel);
	FU.classFeatures.magiseed = registry.register(SYSTEM, 'magiseed', MagiseedDataModel);
	FU.classFeatures.ingredient = registry.register(SYSTEM, 'ingredient', IngredientDataModel);
	FU.classFeatures.cookbook = registry.register(SYSTEM, 'cookbook', CookbookDataModel);
}
