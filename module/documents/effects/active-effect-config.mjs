import { FU } from '../../helpers/config.mjs';

// TODO: Replace with ActiveEffectConfig override in V13?

/**
 * A hook event that fires when the ActiveEffectConfig application is rendered
 * @param {ActiveEffectConfig} sheet The Application instance being rendered
 * @param {JQuery<HTMLElement>} html  The inner HTML of the document that will be displayed and may be modified
 * @param {Record<string, any>} context The object of data used when rendering the application
 */
export async function onRenderActiveEffectConfig(sheet, html, context) {
	let data = context.data;
	data.system = sheet.document.system;
	data.effectDuration = FU.effectDuration;
	data.effectType = FU.effectType;
	data.effectTracking = FU.effectTracking;
	data.crisisInteractions = FU.crisisInteractions;

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

	// Effects Tab
	const effectsTab = html.find('.tab[data-tab=effects]');
	if (!html.find('#effect-key-options').length) {
		const options = getAttributeKeys();
		const datalist = $('<datalist id="effect-key-options"></datalist>');
		options.forEach((opt) => datalist.append(`<option value="${opt}">`));
		html.append(datalist);
	}
	html.find('.key input').each((index, el) => {
		const $el = $(el);
		const name = $el.attr('name');
		const value = $el.val();

		// Create the new input element (e.g., with a datalist or custom attributes)
		const $newInput = $(`<input type="text" name="${name}" value="${value}" list="effect-key-options" />`);
		// Replace the original input with the new one
		$el.replaceWith($newInput);
	});

	// Rules Tab (Add)
	const rulesTemplate = await renderTemplate(`systems/projectfu/templates/effects/active-effect-rules.hbs`, data);
	effectsTab.before(rulesTemplate);

	sheet.setPosition({ ...sheet.position, height: 'auto' });
}

let attributeKeys = undefined;

/**
 * @returns {String[]}
 */
function getAttributeKeys() {
	if (!attributeKeys) {
		attributeKeys = [];
		const characterFields = CONFIG.Actor.dataModels.character.schema.fields;
		if (characterFields) {
			attributeKeys = attributeKeys.concat(flattenSchemaFields(characterFields, 'system'));
			// TODO: Derived Keys
			// Resources
			for (const res of ['hp', 'mp', 'ip']) {
				attributeKeys.push(`system.resources.${res}.max`);
			}
			// Attributes
			for (const attr of Object.keys(FU.attributes)) {
				attributeKeys.push(`system.attributes.${attr}.current`);
			}
			// Stats
			// for (const stat of ['def', 'mdef', 'init']) {
			// 	attributeKeys.push(`system.derived.${stat}.value`);
			// }
			// Affinities
			for (const aff of Object.keys(FU.damageTypes)) {
				attributeKeys.push(`system.affinities.${aff}.current`);
			}
		}
		attributeKeys = attributeKeys.sort((a, b) => b.localeCompare(a));
	}
	return attributeKeys;
}

function flattenSchemaFields(obj, prefix = '', result = []) {
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value.fields) {
			flattenSchemaFields(value.fields, path, result);
		} else {
			result.push(path);
		}
	}
	return result;
}
