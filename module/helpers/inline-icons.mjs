import { FU } from './config.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { StringUtils } from './string-utils.mjs';

const inlineIconEnricher = {
	id: 'inlineIconEnricher',
	pattern: InlineHelper.compose('(?:ICON|TOOLTIP)', '(?<icon>\\w+)(?:\\s+"(?<tooltip>[^"]*)")?'),
	enricher: enricher,
};

function enricher(text, options) {
	//const iconName = text[1];
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

function getIconClass(icon) {
	return FU.allIcon[icon];
}

/**
 * @type {FUInlineCommand}
 */
export const InlineIcon = Object.freeze({
	enrichers: [inlineIconEnricher],
	getIconClass,
});
