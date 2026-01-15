import { InlineHelper } from './inline-helper.mjs';
import { FU } from './config.mjs';
import { getSelected, targetHandler } from './target-handler.mjs';
import { ActionHandler } from './action-handler.mjs';
import { StringUtils } from './string-utils.mjs';
import { HTMLUtils } from './html-utils.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';

const className = `inline-type`;

/**
 * @typedef ActionPropertyGroup
 * @property {FUActionType} type
 * @property {String} bonus
 */

const actionPropertyGroups = [InlineHelper.propertyPattern('bonus', 'bonus', '[^\\s]+')];

/**
 * @type {TextEditorEnricherConfig}
 */
const editorEnricher = {
	id: 'InlineActionEnricher',
	pattern: InlineHelper.compose('ACTION', `(?<type>\\w+)`, actionPropertyGroups),
	enricher: (match, options) => {
		const type = match.groups.type.toLowerCase();

		if (type && type in FU.actionTypes) {
			const anchor = document.createElement('a');
			anchor.classList.add('inline', className);
			anchor.draggable = true;
			anchor.dataset.type = type;
			HTMLUtils.appendRegexGroupsToDataset(match, anchor.dataset);
			anchor.setAttribute('data-tooltip', `${game.i18n.localize(FU.actionTypes[type])}`);

			// ICON
			const icon = FU.actionIcons[type];
			InlineHelper.appendIcon(anchor, 'fu-icon-s', icon);
			/** @type FUActionType **/
			switch (type) {
				case 'study':
					break;
			}
			anchor.append(StringUtils.localize(FU.actionTypes[type]));

			return anchor;
		}

		return null;
	},
	onRender: onRender,
};

/**
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
async function onRender(element) {
	const renderContext = await InlineHelper.getRenderContext(element);

	// Click handler
	element.addEventListener('click', async function () {
		const selected = await getSelected(true);
		if (selected.length === 1) {
			/** @type {ActionPropertyGroup} **/
			const dataset = renderContext.dataset;
			const type = dataset.type;
			const actor = selected[0];
			let bonus;

			const actionHandler = new ActionHandler(actor);

			// If a bonus is provided...
			if (dataset.bonus) {
				const targets = await targetHandler();
				const context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
				bonus = await Expressions.evaluateAsync(dataset.bonus, context);
				actionHandler.withBonus(bonus);
			}

			switch (type) {
				case 'study':
					await actionHandler.handleAction(type, false);
					break;
			}
		}
	});
}

/**
 * @type {FUInlineCommand}
 */
export const InlineAction = {
	enrichers: [editorEnricher],
};
