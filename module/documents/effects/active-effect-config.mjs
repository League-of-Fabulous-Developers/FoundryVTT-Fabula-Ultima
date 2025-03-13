import { FU, SYSTEM } from '../../helpers/config.mjs';

// TODO: Replace with ActiveEffectConfig override in V13?

const CRISIS_INTERACTION = 'CrisisInteraction';
const EFFECT_TYPE = 'type';
const PAGE_REFERENCE = 'source';

const crisisInteractions = {
	none: 'FU.EffectCrisisInteractionNone',
	active: 'FU.EffectCrisisInteractionActive',
	inactive: 'FU.EffectCrisisInteractionInactive',
};

const effectType = {
	default: 'FU.Effect',
	quality: 'FU.Quality',
	customization: 'FU.Customization',
};

/**
 * A hook event that fires when the ActiveEffectConfig application is rendered
 * @param {ActiveEffectConfig} sheet The Application instance being rendered
 * @param {JQuery<HTMLElement>} html  The inner HTML of the document that will be displayed and may be modified
 * @param {Record<string, any>} context The object of data used when rendering the application
 */
export async function onRenderActiveEffectConfig(sheet, html, context) {
	const flag = sheet.document.getFlag(SYSTEM, CRISIS_INTERACTION);
	const sourceFlag = sheet.document.getFlag(SYSTEM, PAGE_REFERENCE) || '';
	const effectTypeFlag = sheet.document.getFlag(SYSTEM, EFFECT_TYPE) || 'default'; // Default to 'effect'
	const data = {
		effect: sheet.document,
		system: sheet.document.system,
		effectDuration: FU.effectDuration,
	};

	// Effect Type select field
	html.find('.tab[data-tab=details] .form-group:nth-child(3)').after(`
		<div class="form-group">
			<label>${game.i18n.localize('FU.EffectType')}</label>
			<select name="flags.${SYSTEM}.${EFFECT_TYPE}" ${sheet.isEditable ? '' : 'disabled'}>
				${Object.entries(effectType).map(
					([key, value]) =>
						`<option value="${key}" ${key === effectTypeFlag ? 'selected' : ''}>
				  ${game.i18n.localize(value)}</option>`,
				)}
			</select>
		</div>
	`);

	// Source input field
	html.find('.tab[data-tab=details] .form-group:nth-child(4)').after(`
		<div class="form-group">
			<label>${game.i18n.localize('FU.EffectSource')}</label>
			<input type="text" name="flags.${SYSTEM}.${PAGE_REFERENCE}" value="${sourceFlag}" ${sheet.isEditable ? '' : 'disabled'}>
		</div>
	`);

	html.find('.tab[data-tab=details] .form-group:nth-child(5)').after(`
	<div class="form-group">
        <label>${game.i18n.localize('FU.EffectCrisisInteraction')}</label>
        <select name="flags.${SYSTEM}.${CRISIS_INTERACTION}" ${sheet.isEditable ? '' : 'disabled'}>
          ${Object.entries(crisisInteractions).map(([key, value]) => `<option value="${key}" ${key === flag ? 'selected' : ''}>${game.i18n.localize(value)}</option>`)}
        </select>
    </div>
	`);

	// Duration Tab (Replace)
	const durationTab = html.find('.tab[data-tab=duration]');
	durationTab.empty();
	const durationTemplate = await renderTemplate(`systems/projectfu/templates/common/active-effect-duration.hbs`, data);
	durationTab.append(durationTemplate);

	sheet.setPosition({ ...sheet.position, height: 'auto' });
}
