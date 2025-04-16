import { FU } from '../../helpers/config.mjs';

// TODO: Replace with ActiveEffectConfig override in V13?

/**
 * A hook event that fires when the ActiveEffectConfig application is rendered
 * @param {ActiveEffectConfig} sheet The Application instance being rendered
 * @param {JQuery<HTMLElement>} html  The inner HTML of the document that will be displayed and may be modified
 * @param {Record<string, any>} context The object of data used when rendering the application
 */
export async function onRenderActiveEffectConfig(sheet, html, context) {
	const data = {
		effect: sheet.document,
		system: sheet.document.system,
		effectDuration: FU.effectDuration,
		effectType: FU.effectType,
		effectTracking: FU.effectTracking,
		crisisInteractions: FU.crisisInteractions,
	};

	// Effect Type select field (Append)
	const detailsTemplate = await renderTemplate(`systems/projectfu/templates/effects/active-effect-details.hbs`, data);
	html.find('.tab[data-tab=details] .form-group:nth-child(3)').after(detailsTemplate);

	// Find the navigation element
	let nav = html.find('nav.sheet-tabs.tabs');
	if (nav.length) {
		const targetTab = nav.find('a[data-tab="effects"]');

		// Predicates
		const predicateLabel = game.i18n.localize('FU.Predicate');
		const predicateTab = `<a class="item" data-tab="predicate"><i class="fas fa-book"></i>${predicateLabel}</a>`;
		targetTab.before(predicateTab);

		// Rules
		const rulesLabel = game.i18n.localize('FU.Rule');
		const rulesTab = `<a class="item" data-tab="rules"><i class="fas fa-book"></i>${rulesLabel}</a>`;
		targetTab.before(rulesTab);
	}

	// Duration Tab (Replace)
	const durationTab = html.find('.tab[data-tab=duration]');
	durationTab.empty();
	const durationTemplate = await renderTemplate(`systems/projectfu/templates/effects/active-effect-duration.hbs`, data);
	durationTab.append(durationTemplate);

	// Predicate Tab (Add)
	const predicateTemplate = await renderTemplate(`systems/projectfu/templates/effects/active-effect-predicate.hbs`, data);
	durationTab.before(predicateTemplate);

	// Rules Tab (Add)
	const effectsTab = html.find('.tab[data-tab=effects]');
	const rulesTemplate = await renderTemplate(`systems/projectfu/templates/effects/active-effect-rules.hbs`, data);
	effectsTab.before(rulesTemplate);

	sheet.setPosition({ ...sheet.position, height: 'auto' });
}
