import { systemTemplatePath } from '../../helpers/system-utils.mjs';

/**
 * @typedef FUPartialTemplate
 * @property {String} template
 * @property {String} group
 */

/**
 * @type {Map<String, FUPartialTemplate>}
 * @remarks Not the nicest way to do it, but...
 */
export const ItemPartialTemplates = Object.freeze({
	controls: { template: systemTemplatePath('item/partials/item-controls'), group: 'settings' },
	qualityCost: { template: systemTemplatePath('item/partials/item-quality-cost') },
	accuracy: { template: systemTemplatePath('item/partials/item-accuracy-section'), group: 'grid' },
	legacyAccuracy: { template: systemTemplatePath('item/partials/item-accuracy-section-legacy'), group: 'grid' },
	damage: { template: systemTemplatePath('item/partials/item-damage-section'), group: 'grid' },
	legacyDamage: { template: systemTemplatePath('item/partials/item-damage-section-legacy'), group: 'grid' },
	resourcePoints: { template: systemTemplatePath('item/partials/item-resource-points') },
	classBenefits: { template: systemTemplatePath('item/partials/item-class-benefits') },
	skillAttributes: { template: systemTemplatePath('item/partials/item-skill-attributes') },
	targeting: { template: systemTemplatePath('item/partials/item-targeting'), group: 'grid' },
	actionCost: { template: systemTemplatePath('item/partials/item-action-cost'), group: 'grid' },
	attackAccuracy: { template: systemTemplatePath('item/partials/item-attack-accuracy'), group: 'grid' },
	attackDamage: { template: systemTemplatePath('item/partials/item-attack-damage'), group: 'grid' },
	weaponSettings: { template: systemTemplatePath('item/partials/item-weapon-settings'), group: 'settings' },

	opportunityField: { template: systemTemplatePath('item/partials/item-opportunity-field') },
	initiativeField: { template: systemTemplatePath('item/partials/item-initiative-field') },
	behaviorField: { template: systemTemplatePath('item/partials/item-behavior-field') },
	progressField: { template: systemTemplatePath('item/partials/item-progress-field'), group: 'section' },
	progressClock: { template: systemTemplatePath('item/partials/item-progress-clock'), group: 'section' },
	classField: { template: systemTemplatePath('item/partials/item-class-field') },
	flawedField: { template: systemTemplatePath('item/partials/item-flawed-field'), group: 'settings' },
	durationField: { template: systemTemplatePath('item/partials/item-duration-field') },
	ipCostField: { template: systemTemplatePath('item/partials/item-ip-cost-field') },

	armor: { template: systemTemplatePath('item/partials/item-armor-attributes') },
	accessory: { template: systemTemplatePath('item/partials/item-accessory-attributes') },
	shield: { template: systemTemplatePath('item/partials/item-shield-attributes') },
	ritual: { template: systemTemplatePath('item/partials/item-ritual-attributes'), group: 'section' },
	project: { template: systemTemplatePath('item/partials/item-project-attributes'), group: 'section' },
	treasure: { template: systemTemplatePath('item/partials/item-treasure-attributes') },
	weapon: { template: systemTemplatePath('item/partials/item-weapon-attributes') },
	heroicSkill: { template: systemTemplatePath('item/partials/item-heroic-skill-attributes') },
	behavior: { template: systemTemplatePath('item/partials/item-behavior-attributes') },
});
