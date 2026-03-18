import { FU } from '../helpers/config.mjs';
import { targetHandler } from '../helpers/target-handler.mjs';
import { Checks } from '../checks/checks.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DifficultyLevel } from '../checks/difficulty-level.mjs';
import { InlineHelper } from '../helpers/inline-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { CheckPrompt } from '../checks/check-prompt.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';

/**
 * @typedef InlineCheckDataset
 * @extends DOMStringMap
 * @inheritDoc
 * @property {CheckType} type
 * @property first
 * @property second
 * @property modifier
 * @property label
 * @property document
 * @property propertyPath
 * @property index
 * @property increment
 */

const DEFAULT_CHECK_TYPE = 'attribute';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineCheckEnricher = {
	id: 'InlineCheckEnricher',
	pattern: InlineHelper.compose(
		'CHECK',
		'\\s*(?<first>\\w+)\\s*(?<second>\\w+)\\s*(?<modifier>\\(.*?\\))*\\s*(?<level>\\w+)?',
		InlineHelper.documentPropertyGroup.concat(InlineHelper.propertyPattern('increment', 'increment', '(true|false)', true), InlineHelper.propertyPattern('type', 't', '\\w+')),
	),
	enricher: checkEnricher,
	onRender: onRender,
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
	const type = match.groups.type ?? DEFAULT_CHECK_TYPE;

	if (first in FU.attributes && second in FU.attributes) {
		const anchor = document.createElement('a');
		anchor.dataset.first = first;
		anchor.dataset.second = second;
		anchor.dataset.type = type;
		anchor.classList.add('inline', 'inline-check');

		let tooltip = game.i18n.localize('FU.InlineRollCheck');

		// ICON
		InlineHelper.appendSystemIcon(anchor, type);

		if (label) {
			anchor.append(label);
			anchor.dataset.label = label;
		}
		// [OPTIONAL] Modifier
		let modifier = (match.groups.modifier ?? '').slice(1, -1);
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
		// [OPTIONAL] Document, PropertyPath, Index, Increment
		anchor.dataset.document = match.groups.document;
		anchor.dataset.propertyPath = match.groups.propertyPath;
		anchor.dataset.index = match.groups.index;
		anchor.dataset.increment = match.groups.increment;
		// Show attributes
		const span = document.createElement('span');
		span.classList.add(`inline`, 'inline-group');
		InlineHelper.appendSystemIcon(span, first);
		InlineHelper.appendSystemIcon(span, second);
		anchor.append(span);
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
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
async function onRender(element) {
	const renderContext = await InlineHelper.getRenderContext(element);

	element.addEventListener('click', async (event) => {
		/** @type InlineCheckDataset **/
		const dataset = renderContext.dataset;
		const first = dataset.first;
		const second = dataset.second;
		const difficulty = dataset.difficulty;
		const prompt = event.shiftKey;
		const attributes = { primary: first, secondary: second };
		const targets = await targetHandler();
		let type = dataset.type;

		/** @type CheckResultCallback **/
		const onResult = async (check) => {
			if (difficulty && dataset.document) {
				const result = check.result;
				console.debug(`Processing check result of ${result} versus difficulty ${difficulty}`);
				if (result.fumble || result < difficulty) {
					return;
				}

				// TODO: Factor out into function in checks API?
				let increment = ProgressDataModel.calculateChange(result, difficulty, result.critical);
				if (dataset.increment === 'false') {
					increment = -increment;
				}

				const document = await fromUuid(dataset.document);
				if (dataset.index) {
					await ProgressDataModel.updateAtIndexForDocument(document, dataset.propertyPath, dataset.index, increment, {
						source: targets[0],
					});
				}
			}
		};

		if (targets.length === 0) return;

		const item = renderContext.sourceInfo.resolveItem();

		for (const actor of targets) {
			if (prompt) {
				let modifier = 0;
				if (dataset.modifier !== undefined) {
					const context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
					modifier = await Expressions.evaluateAsync(dataset.modifier, context);
					if (isNaN(modifier)) {
						modifier = 0;
					}
				}

				switch (type) {
					case 'attribute':
						await CheckPrompt.attributeCheck(actor, {
							initialConfig: {
								primary: attributes.primary,
								secondary: attributes.secondary,
								difficulty: difficulty,
								modifier: modifier,
								label: dataset.label,
							},
							checkCallback: (check) => {
								let config = CheckConfiguration.configure(check);
								config.setLabel(dataset.label);
							},
							resultCallback: onResult,
						});
						break;

					case 'open':
						await CheckPrompt.openCheck(actor, {
							initialConfig: {
								primary: attributes.primary,
								secondary: attributes.secondary,
								modifier: modifier,
								label: dataset.label,
							},
							checkCallback: (check) => {
								let config = CheckConfiguration.configure(check);
								config.setLabel(dataset.label);
							},
						});
						break;

					case 'opposed':
						await CheckPrompt.opposedCheck(actor, {
							initialConfig: {
								primary: attributes.primary,
								secondary: attributes.secondary,
								modifier: modifier,
								label: dataset.label,
							},
							checkCallback: (check) => {
								let config = CheckConfiguration.configure(check);
								config.setLabel(dataset.label);
							},
						});
						break;
				}
			} else {
				switch (type) {
					case 'attribute':
						await Checks.attributeCheck(
							actor,
							attributes,
							null,
							async (check) => {
								let config = CheckConfiguration.configure(check);
								config.setLabel(dataset.label);
								let modifier = 0;

								if (item) {
									config.setItemReference(item);
								}

								if (dataset.modifier !== undefined) {
									const context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
									modifier = await Expressions.evaluateAsync(dataset.modifier, context);
								}

								if (difficulty > 0) {
									config.setDifficulty(difficulty);
								}

								if (modifier !== 0) {
									config.addModifier('Inline Modifier', modifier);
								}
							},
							onResult,
						);
						break;

					case 'open':
						await Checks.openCheck(actor, attributes, async (check) => {
							let config = CheckConfiguration.configure(check);
							config.setLabel(dataset.label);
							let modifier = 0;

							if (dataset.modifier !== undefined) {
								const context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
								modifier = await Expressions.evaluateAsync(dataset.modifier, context);
							}

							if (item) {
								config.setItemReference(item);
							}

							if (modifier !== 0) {
								config.addModifier('Inline Modifier', modifier);
							}
						});
						break;

					case 'opposed':
						await Checks.opposedCheckV2(actor, attributes, {}, async (check) => {
							let config = CheckConfiguration.configure(check);
							if (item) {
								config.setItemReference(item);
							}
							config.setLabel(dataset.label);
						});
						break;
				}
			}
		}
	});
}

/**
 * @type {FUInlineCommand}
 */
export const InlineChecks = Object.freeze({
	enrichers: [inlineCheckEnricher],
});
