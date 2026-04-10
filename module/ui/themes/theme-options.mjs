import { ObjectUtils } from '../../helpers/object-utils.mjs';
import { readJsonFromSystemFile, systemAssetPath } from '../../helpers/system-utils.mjs';
import { Theme } from './theme.mjs';
import { getSystemSetting } from '../../settings.js';

/**
 * @typedef {Object} ThemeOptions
 *
 * === Controls - Default ===
 * @property {string} colorControlContent
 * @property {string} colorControlBorder
 * @property {string} colorControlFocusContent
 * @property {string} colorControlInactiveContent
 * @property {string} colorControlFill1
 * @property {string} colorControlFill2
 *
 * === Controls - Highlight ===
 * @property {string} colorControlHighlightContent
 * @property {string} colorControlHighlightBorder
 * @property {string} colorControlHighlightFill1
 * @property {string} colorControlHighlightFill2
 *
 * === Controls - Active ===
 * @property {string} colorControlActiveContent
 * @property {string} colorControlActiveBorder
 * @property {string} colorControlActiveFill1
 * @property {string} colorControlActiveFill2
 *
 * === Apps - Default ===
 * @property {string} colorAppBorder
 *
 * === Apps - Header ===
 * @property {string} colorAppHeaderContent
 * @property {string} colorAppHeaderFocusContent
 * @property {string} colorAppHeaderFill1
 * @property {string} colorAppHeaderFill2
 *
 * === Apps - Body ===
 * @property {string} colorAppBodyContent
 * @property {string} colorAppBodyContentSecondary
 * @property {string} colorAppBodyPrimaryFill1
 * @property {string} colorAppBodyPrimaryFill2
 * @property {string} colorAppNameSectionContent
 * @property {string} colorAppNameSectionShadow
 * @property {string} colorAppNameSectionFill1
 * @property {string} colorAppNameSectionFill2
 * @property {string} colorAppControlContent
 * @property {string} colorAppControlFocusContent
 * @property {string} colorAppControlBorder
 * @property {string} colorAppControlShadow
 * @property {string} colorAppControlFill1
 * @property {string} colorAppControlFill2
 * @property {string} colorAppControlHighlightContent
 * @property {string} colorAppControlHighlightBorder
 * @property {string} colorAppControlHighlightShadow
 * @property {string} colorAppControlHighlightFill1
 * @property {string} colorAppControlHighlightFill2
 * @property {string} colorAppControlActiveContent
 * @property {string} colorAppControlActiveBorder
 * @property {string} colorAppControlActiveShadow
 * @property {string} colorAppControlActiveFill1
 * @property {string} colorAppControlActiveFill2
 * @property {string} colorAppImageFill1
 * @property {string} colorAppImageFill2
 * @property {string} colorAppItemHeaderContent
 * @property {string} colorAppItemHeaderContentFocus
 * @property {string} colorAppItemHeaderFill1
 * @property {string} colorAppItemHeaderFill2
 * @property {string} colorAppItemHeaderShadow
 * @property {string} colorAppItemHighlightBorder
 * @property {string} colorAppItemHighlightFill1
 * @property {string} colorAppItemHighlightFill2
 * @property {string} colorAppClockBorder
 * @property {string} colorAppClockFill1
 * @property {string} colorAppClockFill2
 * @property {string} colorAppClockBg1
 * @property {string} colorAppClockBg2
 * @property {string} colorAppDetailSectionContentPrimary
 * @property {string} colorAppDetailSectionContentSecondary
 * @property {string} colorAppDetailSectionContentTertiary
 * @property {string} colorAppDetailSectionBorder
 * @property {string} colorAppDetailSectionShadow
 * @property {string} colorAppDetailSectionLabel
 * @property {string} colorAppDetailSectionPrimaryFill1
 * @property {string} colorAppDetailSectionPrimaryFill2
 * @property {string} colorAppSectionContentPrimary
 * @property {string} colorAppSectionContentSecondary
 * @property {string} colorAppSectionContentTertiary
 * @property {string} colorAppSectionBorder
 * @property {string} colorAppSectionPrimaryFill1
 * @property {string} colorAppSectionPrimaryFill2
 * @property {string} colorAppScrollbar
 * @property {string} colorAppScrollbarTrack
 *
 * === HUD ===
 * @property {string} colorHudBackgroundFill1
 * @property {string} colorHudBackgroundFill2
 *
 * === Images ===
 * @property {string} uiAccentImage
 * @property {string} appAccentImage
 * @property {string} appBgImage
 * @property {string} appSectionBgImage
 * @property {string} sidebarBgImage
 *
 * === Misc ===
 * @property {string} colorMiscShadowPrimary
 * @property {string} colorMiscShadowHighlight
 * @property {string} colorMiscBorderHighlight
 * @property {string} colorMiscScrollbar
 * @property {string} colorMiscScrollbarTrack
 *
 * === Advanced ===
 * @property {string} advanced
 */

/**
 * @type {Readonly<Record<String, Object>>}
 */
export const ThemeOptionFields = ObjectUtils.deepFreeze({
	/* Controls - Default */
	colorControlContent: { label: 'FU.ColorControlContentLabel', type: 'color' },
	colorControlFocusContent: { label: 'FU.ColorControlFocusContentLabel', type: 'color' },
	colorControlInactiveContent: { label: 'FU.ColorControlInactiveContentLabel', type: 'color' },
	colorControlBorder: { label: 'FU.ColorControlBorderLabel', type: 'color' },
	colorControlFill1: { label: 'FU.ColorControlFill1Label', type: 'color' },
	colorControlFill2: { label: 'FU.ColorControlFill2Label', type: 'color' },

	/* Controls - Highlight */
	colorControlHighlightContent: { label: 'FU.ColorControlHighlightContentLabel', type: 'color' },
	colorControlHighlightBorder: { label: 'FU.ColorControlHighlightBorderLabel', type: 'color' },
	colorControlHighlightFill1: { label: 'FU.ColorControlHighlightFill1Label', type: 'color' },
	colorControlHighlightFill2: { label: 'FU.ColorControlHighlightFill2Label', type: 'color' },

	/* Controls - Active */
	colorControlActiveContent: { label: 'FU.ColorControlActiveContentLabel', type: 'color' },
	colorControlActiveBorder: { label: 'FU.ColorControlActiveBorderLabel', type: 'color' },
	colorControlActiveFill1: { label: 'FU.ColorControlActiveFill1Label', type: 'color' },
	colorControlActiveFill2: { label: 'FU.ColorControlActiveFill2Label', type: 'color' },

	/* Apps - Default */
	colorAppBorder: { label: 'FU.ColorAppBorderLabel', type: 'color' },

	/* Apps - Header */
	colorAppHeaderContent: { label: 'FU.ColorAppHeaderContentLabel', type: 'color' },
	colorAppHeaderFocusContent: { label: 'FU.ColorAppHeaderContentFocusContentLabel', type: 'color' },
	colorAppHeaderFill1: { label: 'FU.ColorAppHeaderFill1Label', type: 'color' },
	colorAppHeaderFill2: { label: 'FU.ColorAppHeaderFill2Label', type: 'color' },

	/* Apps - Name Section */
	colorAppNameSectionContent: { label: 'FU.ColorAppHeaderNameSectionContentLabel', type: 'color' },
	colorAppNameSectionShadow: { label: 'FU.ColorAppHeaderNameSectionShadowLabel', type: 'color' },
	colorAppNameSectionFill1: { label: 'FU.ColorAppHeaderNameSectionFill1Label', type: 'color' },
	colorAppNameSectionFill2: { label: 'FU.ColorAppHeaderNameSectionFill2Label', type: 'color' },

	/* Apps - Body */
	colorAppBodyContent: { label: 'FU.ColorAppBodyContentLabel', type: 'color' },
	colorAppBodyContentSecondary: { label: 'FU.ColorAppBodyContentSecondaryLabel', type: 'color' },
	colorAppBodyPrimaryFill1: { label: 'FU.ColorAppBodyPrimaryFill1Label', type: 'color' },
	colorAppBodyPrimaryFill2: { label: 'FU.ColorAppBodyPrimaryFill2Label', type: 'color' },

	/* Apps - Controls */
	colorAppControlContent: { label: 'FU.ColorControlContentLabel', type: 'color' },
	colorAppControlFocusContent: { label: 'FU.ColorAppControlFocusContentLabel', type: 'color' },
	colorAppControlBorder: { label: 'FU.ColorAppControlBorderLabel', type: 'color' },
	colorAppControlShadow: { label: 'FU.ColorAppControlShadowLabel', type: 'color' },
	colorAppControlFill1: { label: 'FU.ColorControlFill1Label', type: 'color' },
	colorAppControlFill2: { label: 'FU.ColorControlFill2Label', type: 'color' },
	colorAppControlHighlightContent: { label: 'FU.ColorAppControlHighlightContentLabel', type: 'color' },
	colorAppControlHighlightBorder: { label: 'FU.ColorAppControlHighlightBorderLabel', type: 'color' },
	colorAppControlHighlightShadow: { label: 'FU.ColorAppControlHighlightShadowLabel', type: 'color' },
	colorAppControlHighlightFill1: { label: 'FU.ColorAppControlHighlightFill1Label', type: 'color' },
	colorAppControlHighlightFill2: { label: 'FU.ColorAppControlHighlightFill2Label', type: 'color' },
	colorAppControlActiveContent: { label: 'FU.ColorAppControlActiveContentLabel', type: 'color' },
	colorAppControlActiveBorder: { label: 'FU.ColorAppControlActiveBorderLabel', type: 'color' },
	colorAppControlActiveShadow: { label: 'FU.ColorAppControlActiveShadowLabel', type: 'color' },
	colorAppControlActiveFill1: { label: 'FU.ColorAppControlActiveFill1Label', type: 'color' },
	colorAppControlActiveFill2: { label: 'FU.ColorAppControlActiveFill2Label', type: 'color' },

	/* Apps - Item Header */
	colorAppItemHeaderContent: { label: 'FU.ColorAppItemHeaderContentLabel', type: 'color' },
	colorAppItemHeaderContentFocus: { label: 'FU.ColorAppItemHeaderContentFocusLabel', type: 'color' },
	colorAppItemHeaderFill1: { label: 'FU.ColorAppItemHeaderFill1Label', type: 'color' },
	colorAppItemHeaderFill2: { label: 'FU.ColorAppItemHeaderFill2Label', type: 'color' },
	colorAppItemHeaderShadow: { label: 'FU.ColorAppItemHeaderShadowLabel', type: 'color' },
	colorAppItemHighlightBorder: { label: 'FU.ColorAppItemHighlightBorderLabel', type: 'color' },
	colorAppItemHighlightFill1: { label: 'FU.ColorAppItemHighlightFill1Label', type: 'color' },
	colorAppItemHighlightFill2: { label: 'FU.ColorAppItemHighlightFill2Label', type: 'color' },

	/* Apps - Clock */
	colorAppClockBorder: { label: 'FU.ColorAppClockBorderLabel', type: 'color' },
	colorAppClockFill1: { label: 'FU.ColorAppClockFill1Label', type: 'color' },
	colorAppClockFill2: { label: 'FU.ColorAppClockFill2Label', type: 'color' },
	colorAppClockBg1: { label: 'FU.ColorAppClockBg1Label', type: 'color' },
	colorAppClockBg2: { label: 'FU.ColorAppClockBg2Label', type: 'color' },

	/* Apps - Image */
	colorAppImageFill1: { label: 'FU.ColorAppImageFill1Label', type: 'color' },
	colorAppImageFill2: { label: 'FU.ColorAppImageFill2Label', type: 'color' },

	/* Apps - Section */
	colorAppSectionContentPrimary: { label: 'FU.ColorAppSectionContentPrimaryLabel', type: 'color' },
	colorAppSectionContentSecondary: { label: 'FU.ColorAppSectionContentSecondaryLabel', type: 'color' },
	colorAppSectionContentTertiary: { label: 'FU.ColorAppSectionContentTertiaryLabel', type: 'color' },
	colorAppSectionBorder: { label: 'FU.ColorAppSectionBorderLabel', type: 'color' },
	colorAppSectionPrimaryFill1: { label: 'FU.ColorAppSectionFill1Label', type: 'color' },
	colorAppSectionPrimaryFill2: { label: 'FU.ColorAppSectionFill2Label', type: 'color' },

	/* Apps - Detail Section */
	colorAppDetailSectionContentPrimary: { label: 'FU.ColorAppDetailSectionContentPrimaryLabel', type: 'color' },
	colorAppDetailSectionContentSecondary: { label: 'FU.ColorAppDetailSectionContentSecondaryLabel', type: 'color' },
	colorAppDetailSectionContentTertiary: { label: 'FU.ColorAppDetailSectionContentTertiaryLabel', type: 'color' },
	colorAppDetailSectionShadow: { label: 'FU.ColorAppDetailSectionShadowLabel', type: 'color' },
	colorAppDetailSectionPrimaryFill1: { label: 'FU.ColorAppDetailSectionPrimaryFill1Label', type: 'color' },
	colorAppDetailSectionPrimaryFill2: { label: 'FU.ColorAppDetailSectionPrimaryFill2Label', type: 'color' },

	/* Apps - Scrollbar */
	colorAppScrollbar: { label: 'FU.ColorAppScrollbarLabel', type: 'color' },
	colorAppScrollbarTrack: { label: 'FU.ColorAppScrollbarTrackLabel', type: 'color' },

	/* Combat HUD */
	colorHudBackgroundFill1: { label: 'FU.ColorHudBackgroundFill1Label', type: 'color' },
	colorHudBackgroundFill2: { label: 'FU.ColorHudBackgroundFill2Label', type: 'color' },

	/* Misc */
	colorMiscShadowPrimary: { label: 'FU.ColorMiscShadowPrimaryLabel', type: 'color' },
	colorMiscShadowHighlight: { label: 'FU.ColorMiscShadowHighlightLabel', type: 'color' },
	colorMiscBorderHighlight: { label: 'FU.ColorMiscBorderHighlightLabel', type: 'color' },

	/* Images */
	uiAccentImage: { label: 'FU.UiAccentImageLabel', type: 'image' },
	appAccentImage: { label: 'FU.AppAccentImageLabel', type: 'image' },
	appBgImage: { label: 'FU.AppBgImageLabel', type: 'image' },
	appSectionBgImage: { label: 'FU.AppSectionBgImageLabel', type: 'image' },
	sidebarBgImage: { label: 'FU.SidebarBgImageLabel', type: 'image' },

	/* Advanced */
	advanced: {
		label: 'FU.AdvancedLabel',
		hint: 'FU.AdvancedHint',
		type: 'multiline-text',
	},
});

const themeFiles = Object.freeze({
	Default: systemAssetPath('ui/themes/greenly-default.json'),
	ReactorFive: systemAssetPath('ui/themes/reactor-five.json'),
	BravelyRed: systemAssetPath('ui/themes/bravely-red.json'),
	AncientForest: systemAssetPath('ui/themes/ancient-forest.json'),
	FabulaKnights: systemAssetPath('ui/themes/fabula-knights.json'),
});

/**
 * @type {Record<String, Object>} Instantiated themes.
 */
let systemThemes;

async function getSystemThemes(reload = false) {
	if (!systemThemes || reload) {
		systemThemes = {};
		for (const [label, filePath] of Object.entries(themeFiles)) {
			const json = await readJsonFromSystemFile(filePath);
			if (json) {
				systemThemes[label] = json;
			}
		}
	}
	return systemThemes;
}

// TODO: Remove or?
/**
 * @desc The default theme.
 * @type {ThemeOptions}
 */
const defaultTheme = Object.freeze({
	colorControlContent: '#ebf7afff',
	colorControlBorder: '#148782ff',
	colorControlFocusContent: '#ffffffff',
	colorControlInactiveContent: '#ebf7af80',
	colorControlFill1: '#11292999',
	colorControlFill2: '#49a49999',

	colorControlHighlightContent: '#047470ff',
	colorControlHighlightBorder: '#047470ff',
	colorControlHighlightFill1: '#dcd374ff',
	colorControlHighlightFill2: '#fff79aff',

	colorControlActiveContent: '#fff79aff',
	colorControlActiveBorder: '#fff79aff',
	colorControlActiveFill1: '#e28079cc',
	colorControlActiveFill2: '#f1a372cc',

	colorAppBorder: '#148782ff',

	colorAppHeaderContent: '#ebf7afff',
	colorAppHeaderFocusContent: '#ffffffff',
	colorAppHeaderFill1: '#23574bdd',
	colorAppHeaderFill2: '#011f13dd',

	colorAppBodyContent: '#ebF7afff',
	colorAppBodyContentSecondary: '#ebF7afc0',
	colorAppBodyPrimaryFill1: '#112929e0',
	colorAppBodyPrimaryFill2: '#25544fe0',

	colorAppNameSectionContent: '#ebf7afff',
	colorAppNameSectionShadow: '#000000ff',
	colorAppNameSectionFill1: '#532853ff',
	colorAppNameSectionFill2: '#bfb8c4ff',

	colorAppControlContent: '#ebf7afff',
	colorAppControlFocusContent: '#ffffffff',
	colorAppControlBorder: '#148782ff',
	colorAppControlShadow: '#2b4a42ff',
	colorAppControlFill1: '#2b4a42ff',
	colorAppControlFill2: '#2b4a42ff',
	colorAppControlHighlightContent: '#047470ff',
	colorAppControlHighlightBorder: '#3A6359FF',
	colorAppControlHighlightShadow: '#3A6359FF',
	colorAppControlHighlightFill1: '#dcd374ff',
	colorAppControlHighlightFill2: '#fff79aff',
	colorAppControlActiveContent: '#fff79aff',
	colorAppControlActiveBorder: '#753002ff',
	colorAppControlActiveShadow: '#753002ff',
	colorAppControlActiveFill1: '#e28079cc',
	colorAppControlActiveFill2: '#f1a372cc',

	colorAppImageFill1: '#2b4a42ff',
	colorAppImageFill2: '#3d665aff',

	colorAppItemHeaderContent: '#ebf7afff',
	colorAppItemHeaderContentFocus: '#ffffffff',
	colorAppItemHeaderFill1: '#2c584dff',
	colorAppItemHeaderFill2: '#a0cdbcff',
	colorAppItemHeaderShadow: '#2b4a42ff',

	colorAppItemHighlightBorder: '#2b4a42ff',
	colorAppItemHighlightFill1: '#e1efe3ff',
	colorAppItemHighlightFill2: '#e1efe300',

	colorAppClockBorder: '#2b4a42ff',
	colorAppClockFill1: '#2b4a42e0',
	colorAppClockFill2: '#2b4a42e0',
	colorAppClockBg1: '#ffffffb0',
	colorAppClockBg2: '#ffffffb0',

	colorAppDetailSectionContentPrimary: '#272a2aff',
	colorAppDetailSectionContentSecondary: '#2b4a42ff',
	colorAppDetailSectionContentTertiary: '#3d665aff',
	colorAppDetailSectionBorder: '#c9c7b8ff',
	colorAppDetailSectionShadow: '#2b4a42ff',
	colorAppDetailSectionLabel: '#2b4a42ff',
	colorAppDetailSectionPrimaryFill1: '#d4e7e8ff',
	colorAppDetailSectionPrimaryFill2: '#c3dbd6b3',

	colorAppSectionContentPrimary: '#191813ff',
	colorAppSectionContentSecondary: '#2b4a42ff',
	colorAppSectionContentTertiary: '#4b4a44ff',
	colorAppSectionBorder: '#aeb8a8ff',
	colorAppSectionPrimaryFill1: '#f5f5dcff',
	colorAppSectionPrimaryFill2: '#c9c7b8ff',
	colorAppScrollbar: '#5d142bff',
	colorAppScrollbarTrack: '#00000000',

	colorHudBackgroundFill1: '#49a499ff',
	colorHudBackgroundFill2: '#49a499ff',

	uiAccentImage: '',
	appBgImage: systemAssetPath(`ui/HojitasDouble_highres.png`),
	appSectionBgImage: '',
	sidebarBgImage: systemAssetPath('ui/patterns/pattern_hojita_half.png'),

	colorMiscShadowPrimary: '#77ebd7ff',
	colorMiscShadowHighlight: '#E03A3AFF',
	colorMiscBorderHighlight: '#E03A3ACC',
	colorMiscScrollbar: '#5d142bff',
	colorMiscScrollbarTrack: '#00000000',

	advanced: [
		':root {',
		'  --pfu-ui-accent-width: 500px;',
		'  --pfu-ui-accent-height: 500px;',
		'  --pfu-ui-accent-position-top: -24px;',
		'  --pfu-ui-accent-position-left: 1px;',
		'  --pfu-ui-accent-clip-path: inset(0 370px 402px 0);',
		'  --pfu-app-accent-width: 200px;',
		'  --pfu-app-accent-height: 200px;',
		'  --pfu-app-accent-position-top: -42px;',
		'  --pfu-app-accent-position-left: -47px;',
		'  --pfu-border-radius-large: 20px;',
		'  --pfu-border-radius-medium: 10px;',
		'  --pfu-border-radius-small: 5px;',
		'  --pfu-border-width: 1px;',
		'  --pfu-app-section-bg-image-size: clamp(25%, 250px, 100%) auto;',
		'}',
	].join('\n'),
});

function initialize() {
	Theme.from(getSystemSetting('theme')).apply();
	Hooks.once('ready', () => {
		const MODULE_ID = 'projectfu-theme'; // Replace with the module's ID
		if (game.modules.get(MODULE_ID)?.active) {
			ui.notifications.warn(`The module "${game.modules.get(MODULE_ID).title}" is no longer needed with this system version and should be disabled.`, { permanent: true });
			console.warn(`[PFU] Module "${MODULE_ID}" is active but no longer required.`);
		}
	});
}

export const Themes = Object.freeze({
	getSystemThemes,
	defaultTheme,
	initialize,
});
