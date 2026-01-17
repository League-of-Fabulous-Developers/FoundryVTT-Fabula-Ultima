import { FU } from './config.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { StringUtils } from './string-utils.mjs';
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
		const filter = text.groups.filter;
		const anchor = document.createElement('a');
		anchor.dataset.tab = tab;
		anchor.dataset.filter = filter;
		anchor.classList.add('inline', 'inline-icon');
		InlineHelper.appendSystemIcon(anchor, 'compendium');
		const tooltip = StringUtils.localize('FU.CompendiumBrowserOpen', {
			tab: tab,
		});
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

/**
 * @type {FUInlineCommand}
 */
export const InlineIcon = Object.freeze({
	enrichers: [inlineIconEnricher, inlineCompendiumEnricher],
});
