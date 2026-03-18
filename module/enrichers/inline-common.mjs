import { FU } from '../helpers/config.mjs';
import { InlineHelper } from '../helpers/inline-helper.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { CompendiumBrowser } from '../ui/compendium/compendium-browser.mjs';

const inlineIconEnricher = {
	id: 'inlineIconEnricher',
	pattern: InlineHelper.compose('(?:ICON|TOOLTIP)', '(?<icon>\\w+)(?:\\s+"(?<tooltip>[^"]*)")?'),
	enricher: enricher,
};

function enricher(text, options) {
	const iconName = text.groups.icon;

	if (iconName in FU.allIcon) {
		const anchor = document.createElement('a');
		anchor.classList.add('inline', 'inline-icon');
		InlineHelper.appendSystemIcon(anchor, iconName);

		const tooltip = text.groups.tooltip;
		if (tooltip) {
			anchor.setAttribute('data-tooltip', StringUtils.localize(tooltip));
		}
		return anchor;
	}

	return null;
}

const inlineCompendiumEnricher = {
	id: 'inlineCompendiumEnricher',
	pattern: InlineHelper.compose('(?:COMPENDIUM)', '(?<tab>\\w+)(?:\\s+"(?<filter>[^"]*)")?'),
	enricher: (text, options) => {
		const tab = text.groups.tab;
		const filter = text.groups.filter ?? '';

		const anchor = document.createElement('a');
		anchor.dataset.tab = tab;
		anchor.dataset.filter = filter;
		anchor.classList.add('inline', 'inline-common');

		// Tooltip
		InlineHelper.appendSystemIcon(anchor, 'compendium');
		const tooltip = StringUtils.localize('FU.CompendiumBrowserOpen', {
			tab: tab,
		});

		// Label
		const span = document.createElement('span');
		span.classList.add('inline', 'inline-text');
		span.textContent = StringUtils.capitalize(tab);
		anchor.append(span);

		if (tooltip) {
			anchor.setAttribute('data-tooltip', StringUtils.localize(tooltip));
		}
		return anchor;
	},
	onRender: async (element) => {
		const renderContext = await InlineHelper.getRenderContext(element);
		const tab = renderContext.dataset.tab;
		const filter = renderContext.dataset.filter;
		element.addEventListener('click', async function (event) {
			CompendiumBrowser.open(tab, {
				text: filter,
			});
		});
	},
};

const inlineEvalEnricher = {
	id: 'inlineEvalEnricher',
	pattern: InlineHelper.compose('(?:EVAL)', '\\s*(?<expression>\\(?.*?\\)*?)(\\s(?<icon>\\w+?))?'),
	enricher: async (match, options) => {
		const expression = match.groups.expression;
		const icon = match.groups.icon;
		const rollData = options.rollData ?? {};

		if (expression && rollData) {
			const roll = new Roll(expression, rollData);
			await roll.evaluate();

			const anchor = document.createElement('a');
			anchor.classList.add('inline', 'inline-common');

			// TOOLTIP
			anchor.setAttribute('data-tooltip', expression);

			// RESULT
			const result = document.createElement('span');
			result.textContent = `${roll.total}`;
			anchor.append(result);

			// ICON
			if (icon) {
				InlineHelper.appendSystemIcon(anchor, icon);
			}

			return anchor;
		}

		return null;
	},
};

/**
 * @type {FUInlineCommand}
 */
export const InlineCommon = Object.freeze({
	enrichers: [inlineIconEnricher, inlineCompendiumEnricher, inlineEvalEnricher],
});
