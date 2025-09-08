import { FU } from './config.mjs';
import { systemAssetPath } from './system-utils.mjs';
import { InlineHelper } from './inline-helper.mjs';

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
	} else if (iconName in attributeIconPaths) {
		const span = document.createElement('span');
		span.classList.add('inline', 'inline-icon');
		span.dataset.tooltip = game.i18n.localize(FU.attributes[iconName]);
		InlineHelper.appendImage(span, attributeIconPaths[iconName], 16, false);

		return span;
	}

	return null;
}

const attributeIconPaths = {
	dex: systemAssetPath('icons/attributes/dex-glyph.png'),
	mig: systemAssetPath('icons/attributes/mig-glyph.png'),
	ins: systemAssetPath('icons/attributes/ins-glyph.png'),
	wlp: systemAssetPath('icons/attributes/wlp-glyph.png'),
};

/**
 * @type {FUInlineCommand}
 */
export const InlineIcon = Object.freeze({
	enrichers: [inlineIconEnricher],
	attributeIconPaths,
});
