import { FU } from './config.mjs';
import { targetHandler } from './target-handler.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DifficultyLevel } from '../checks/difficulty-level.mjs';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineCheckEnricher = {
	pattern: /@CHECK\[\s*(?<first>\w+)\s*(?<second>\w+)\s*(?<level>\w+)?\]/g,
	enricher: checkEnricher,
};

/**
 * @param {*} match The text within a chat message that matches the given pattern
 * @param {*} options
 * @returns A formatted html element
 */
function checkEnricher(match, options) {
	let first = match[1];
	let second = match[2];

	if (first in FU.attributes && second in FU.attributes) {
		const anchor = document.createElement('a');
		anchor.setAttribute('data-tooltip', game.i18n.localize('FU.InlineRollCheck'));
		anchor.dataset.first = first;
		anchor.dataset.second = second;
		anchor.classList.add('inline', 'inline-check');

		// ICON
		const icon = document.createElement('i');
		icon.classList.add(`icon`, 'fu-check');
		anchor.prepend(icon);
		// FIRST ATTRIBUTE
		anchor.append(`${game.i18n.localize(FU.attributeAbbreviations[first])} `);
		// CONNECTOR
		const connectorIcon = document.createElement(`i`);
		connectorIcon.classList.add(`connector`, `fa-plus`);
		anchor.append(connectorIcon);
		// SECOND ATTRIBUTE
		anchor.append(` ${game.i18n.localize(FU.attributeAbbreviations[second])} `);
		// [OPTIONAL] DIFFICULTY
		let level = match[3];
		if (level !== undefined) {
			appendDifficulty(level, anchor);
		} else {
			anchor.dataset.difficulty = -1;
		}
		return anchor;
	}
	return null;
}

function appendDifficulty(level, anchor) {
	// If using the level enumeration
	if (level in FU.difficultyLevel) {
		anchor.dataset.level = level;
		anchor.dataset.difficulty = DifficultyLevel.toValue(level);
	}
	// Or a direct value
	else {
		let value = parseInt(level);
		if (typeof value === `number`) {
			anchor.dataset.difficulty = value;
			let level = DifficultyLevel.fromValue(value);
			anchor.dataset.level = level;
		}
	}

	const dlConnectorIcon = document.createElement(`i`);
	dlConnectorIcon.classList.add(`connector`, `fa`, `fa-caret-right`);
	anchor.append(dlConnectorIcon);

	const difficultyText = document.createElement(`i`);
	difficultyText.classList.add(`difficulty`);
	difficultyText.append(`${anchor.dataset.difficulty}`);
	anchor.append(difficultyText);
}

/**
 * @param {ClientDocument} document
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	html.find('a.inline.inline-check').on('click', async function () {
		const first = this.dataset.first;
		const second = this.dataset.second;
		const difficulty = this.dataset.difficulty;

		let attributes = {
			primary: first,
			secondary: second,
		};

		let callback = undefined;

		if (difficulty > 0) {
			callback = CheckConfiguration.initDifficulty(difficulty);
		}

		let targets = await targetHandler();
		if (targets.length > 0) {
			for (const actor of targets) {
				ChecksV2.attributeCheck(actor, attributes, callback);
			}
		}
	});
}

/**
 * Used by the CONFIG.TextEditor to hook into Foundry's text editor templating system
 */
export const InlineChecks = {
	enricher: inlineCheckEnricher,
	activateListeners,
};
