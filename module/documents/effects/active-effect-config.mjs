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
		crisisInteractions: FU.crisisInteractions,
	};

	// Effect Type select field (Append)
	const detailsTemplate = await renderTemplate(`systems/projectfu/templates/common/active-effect-details.hbs`, data);
	html.find('.tab[data-tab=details] .form-group:nth-child(3)').after(detailsTemplate);

	// Predicate Tab (Add)

	// Duration Tab (Replace)
	const durationTab = html.find('.tab[data-tab=duration]');
	durationTab.empty();
	const durationTemplate = await renderTemplate(`systems/projectfu/templates/common/active-effect-duration.hbs`, data);
	durationTab.append(durationTemplate);

	sheet.setPosition({ ...sheet.position, height: 'auto' });
}
