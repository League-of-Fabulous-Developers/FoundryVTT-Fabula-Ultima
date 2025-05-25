import { FU } from './config.mjs';
import { targetHandler } from './target-handler.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DifficultyLevel } from '../checks/difficulty-level.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineCheckEnricher = {
	pattern: InlineHelper.compose('CHECK', '\\s*(?<first>\\w+)\\s*(?<second>\\w+)\\s*(?<modifier>\\(.*?\\))*\\s*(?<level>\\w+)?'),
	enricher: checkEnricher,
};

/**
 * @param {RegExpMatchArray} match The text within a chat message that matches the given pattern
 * @param {*} options
 * @returns A formatted html element
 */
function checkEnricher(match, options) {
	let first = match[1];
	let second = match[2];
	const label = match.groups.label;

	if (first in FU.attributes && second in FU.attributes) {
		const anchor = document.createElement('a');
		anchor.dataset.first = first;
		anchor.dataset.second = second;
		anchor.classList.add('inline', 'inline-check');

		let tooltip = game.i18n.localize('FU.InlineRollCheck');

		// ICON
		const icon = document.createElement('i');
		icon.classList.add(`icon`, 'fu-check');
		anchor.prepend(icon);

		if (label) {
			anchor.append(label);
			anchor.dataset.label = label;
		} else {
			// FIRST ATTRIBUTE
			anchor.append(`${game.i18n.localize(FU.attributeAbbreviations[first])} `);
			// CONNECTOR
			const connectorIcon = document.createElement(`i`);
			connectorIcon.classList.add(`connector`, `fa-plus`);
			anchor.append(connectorIcon);
			// SECOND ATTRIBUTE
			anchor.append(` ${game.i18n.localize(FU.attributeAbbreviations[second])} `);
		}
		// [OPTIONAL] Modifier
		let modifier = match.groups.modifier;
		if (modifier) {
			if (label) {
				anchor.dataset.modifier = modifier;
			} else {
				const modifierConnector = document.createElement(`i`);
				modifierConnector.classList.add(`connector`, `fa-plus`);
				modifierConnector.textContent = ' ';
				anchor.append(modifierConnector);
				InlineHelper.appendVariableToAnchor(anchor, 'modifier', modifier, `MOD`);
			}
			tooltip += ` Modifier: (${modifier})`;
		} else {
			anchor.dataset.modifier = 0;
		}
		// [OPTIONAL] DIFFICULTY
		let level = match.groups.level;
		if (level !== undefined) {
			appendDifficulty(level, anchor, label === undefined);
		}
		anchor.setAttribute('data-tooltip', tooltip);
		return anchor;
	}
	return null;
}

function appendDifficulty(level, anchor, show) {
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

	if (show) {
		const dlConnectorIcon = document.createElement(`i`);
		dlConnectorIcon.classList.add(`connector`, `fa`, `fa-caret-right`);
		anchor.append(dlConnectorIcon);

		const difficultyText = document.createElement(`i`);
		difficultyText.classList.add(`difficulty`);
		difficultyText.append(`${anchor.dataset.difficulty}`);
		anchor.append(difficultyText);
	}
}

/**
 * @param {ChatMessage} document
 * @param {HTMLElement | jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	const root = html instanceof HTMLElement ? html : html[0];

	root.querySelectorAll('a.inline.inline-check')?.forEach((el) => {
		el.addEventListener('click', async (event) => {
			const first = el.dataset.first;
			const second = el.dataset.second;
			let difficulty = el.dataset.difficulty;
			const prompt = event.shiftKey;

			const attributes = { primary: first, secondary: second };
			const targets = await targetHandler();

			if (targets.length === 0) return;

			const sourceInfo = InlineHelper.determineSource(document, el);

			for (const actor of targets) {
				await ChecksV2.attributeCheck(actor, attributes, sourceInfo.resolveItem(), async (check) => {
					let config = CheckConfiguration.configure(check);
					let modifier = 0;

					if (el.dataset.modifier !== undefined) {
						const context = ExpressionContext.fromSourceInfo(sourceInfo, targets);
						modifier = await Expressions.evaluateAsync(el.dataset.modifier, context);
					}

					if (prompt) {
						const promptResult = await ChecksV2.promptConfiguration(
							actor,
							{
								primary: check.primary,
								secondary: check.secondary,
								modifier,
								difficulty,
							},
							null,
						);
						config.setAttributes(promptResult.primary, promptResult.secondary);
						modifier = promptResult.modifier;
						difficulty = promptResult.difficulty;
					}

					if (difficulty > 0) {
						config.setDifficulty(difficulty);
					}

					if (modifier !== 0) {
						config.addModifier('Inline Modifier', modifier);
					}
				});
			}
		});
	});
}

/**
 * Used by the CONFIG.TextEditor to hook into Foundry's text editor templating system
 */
export const InlineChecks = {
	enricher: inlineCheckEnricher,
	activateListeners,
};
