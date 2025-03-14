import { FU, SYSTEM } from '../../helpers/config.mjs';

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

	// Effect Type select field
	const detailsTemplate = await renderTemplate(`systems/projectfu/templates/common/active-effect-details.hbs`, data);
	html.find('.tab[data-tab=details] .form-group:nth-child(3)').after(detailsTemplate);

	// Duration Tab (Replace)
	const durationTab = html.find('.tab[data-tab=duration]');
	durationTab.empty();
	const durationTemplate = await renderTemplate(`systems/projectfu/templates/common/active-effect-duration.hbs`, data);
	durationTab.append(durationTemplate);

	sheet.setPosition({ ...sheet.position, height: 'auto' });
}

const CRISIS_INTERACTION = 'CrisisInteraction';
const EFFECT_TYPE = 'type';

export class ActiveEffectMigrations {
	/**
	 * @param {FUActiveEffect} source
	 */
	static run(source) {
		// If this flag is not present, then neither are the other flags
		const effectTypeFlag = source.flags[SYSTEM][EFFECT_TYPE];
		if (!effectTypeFlag) {
			return;
		}
		const crisisFlag = source.flags[SYSTEM][CRISIS_INTERACTION];
		if (!crisisFlag) {
			return;
		}
		console.debug(`Migrating active effect ${source.name} to newer data model`);
		source.system.type = effectTypeFlag;
		source.system.crisisInteraction = crisisFlag;
		delete source.flags;
		//source.flags = {};
		// source.unsetFlag(SYSTEM, EFFECT_TYPE);
		// source.unsetFlag(SYSTEM, CRISIS_INTERACTION);
	}
}
