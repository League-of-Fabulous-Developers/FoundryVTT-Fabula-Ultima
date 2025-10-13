import { TextEditor } from '../text-editor.mjs';
import { getTechnosphereSlotInfo } from '../technospheres.mjs';
import { SYSTEM } from '../config.mjs';
import { SETTINGS } from '../../settings.js';

/**
 * @param {string} [descriptionKey="system.description"]
 * @return {(FUItem) => Promise<string>}
 */
function simpleDescription(descriptionKey) {
	return (item) => renderDescription(item, descriptionKey, []);
}

/**
 * @param {(FUItem) => Tag[]} getTags
 * @param {string} [descriptionKey="system.description"]
 * @return {(FUItem) => Promise<string>}
 */
function descriptionWithTags(getTags, descriptionKey) {
	return function (item) {
		return renderDescription(item, descriptionKey, getTags.call(this, item));
	};
}

/**
 * @param {((document: any) => string|Promise<string>)} descriptionEnricher
 * @param {(FUItem) => Tag[]} [getTags]
 * @return {(FUItem) => Promise<string>}
 */
function descriptionWithCustomEnrichment(descriptionEnricher, getTags) {
	return async function (item) {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/expand/expand-item-description-with-tags.hbs', {
			description: await descriptionEnricher.call(this, item),
			tags: getTags ? getTags.call(this, item) : [],
		});
	};
}

/**
 * @param {FUItem} item
 * @param {string} descriptionKey
 * @param {Tag[]} [tags]
 * @return {Promise<string>}
 */
async function renderDescription(item, descriptionKey = 'system.description', tags = []) {
	return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/expand/expand-item-description-with-tags.hbs', {
		description: await TextEditor.enrichHTML(foundry.utils.getProperty(item, descriptionKey), { rollData: item.getRollData && item.getRollData() }),
		tags: tags,
	});
}

/**
 * @typedef TechnospheresData
 * @property {FUItem[]} slotted
 * @property {number} totalSlots
 * @property {number} maxMnemospheres
 */

/**
 * @param {(FUItem) => TechnospheresData} getTechnosphereData
 * @param {(FUItem) => Tag[]} [getTags]
 * @param {"grid", "flex"} [layout="grid"] grid layout aligns the slots to grid columns while flex layout uses flexbox to position the slots.
 * @param {string} [descriptionKey="system.description"]
 * @return {(FUItem) => Promise<string>}
 */
function descriptionWithTechnospheres(getTechnosphereData, getTags, layout = 'grid', descriptionKey = 'system.description') {
	return async function (item) {
		const tags = getTags ? getTags.call(this, item) : [];

		if (game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			const { slotted, totalSlots, maxMnemospheres } = getTechnosphereData(item);
			return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/expand/expand-item-description-with-slots.hbs', {
				layout: layout,
				description: await TextEditor.enrichHTML(foundry.utils.getProperty(item, descriptionKey), { rollData: item.getRollData && item.getRollData() }),
				tags: tags,
				slots: getTechnosphereSlotInfo(slotted, totalSlots, maxMnemospheres),
			});
		} else {
			return renderDescription(item, descriptionKey, tags);
		}
	};
}

export const CommonDescriptions = Object.freeze({
	simpleDescription,
	descriptionWithTags,
	descriptionWithCustomEnrichment,
	descriptionWithTechnospheres,
});
