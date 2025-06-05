import { FU } from './config.mjs';

const inlineIconEnricher = {
	id: 'inlineIconEnricher',
	pattern: /@ICON\[(\w+?)]/g,
	enricher: enricher,
};

function enricher(text, options) {
	const iconName = text[1];

	if (iconName in FU.allIcon) {
		const iconClass = FU.allIcon[iconName];
		const span = document.createElement('span');
		const classNames = iconClass.split(' ').filter((className) => className !== '');
		span.classList.add('inline', 'inline-icon', ...classNames);
		span.textContent = '';
		return span;
	}

	return null;
}

/**
 * @type {FUInlineCommand}
 */
export const InlineIcon = {
	enrichers: [inlineIconEnricher],
};
