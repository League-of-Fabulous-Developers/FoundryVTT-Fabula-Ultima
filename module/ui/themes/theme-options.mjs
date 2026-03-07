import { ObjectUtils } from '../../helpers/object-utils.mjs';
import { systemPath } from '../../helpers/config.mjs';

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

export const ThemeOptionFields = ObjectUtils.deepFreeze({
	/* Controls - Default */
	colorControlContent: { label: 'projectfu-theme.color-control-content.label', type: 'color' },
	colorControlFocusContent: { label: 'projectfu-theme.color-control-focus-content.label', type: 'color' },
	colorControlInactiveContent: { label: 'projectfu-theme.color-control-inactive-content.label', type: 'color' },
	colorControlBorder: { label: 'projectfu-theme.color-control-border.label', type: 'color' },
	colorControlFill1: { label: 'projectfu-theme.color-control-fill-1.label', type: 'color' },
	colorControlFill2: { label: 'projectfu-theme.color-control-fill-2.label', type: 'color' },

	/* Controls - Highlight */
	colorControlHighlightContent: { label: 'projectfu-theme.color-control-highlight-content.label', type: 'color' },
	colorControlHighlightBorder: { label: 'projectfu-theme.color-control-highlight-border.label', type: 'color' },
	colorControlHighlightFill1: { label: 'projectfu-theme.color-control-highlight-fill-1.label', type: 'color' },
	colorControlHighlightFill2: { label: 'projectfu-theme.color-control-highlight-fill-2.label', type: 'color' },

	/* Controls - Active */
	colorControlActiveContent: { label: 'projectfu-theme.color-control-active-content.label', type: 'color' },
	colorControlActiveBorder: { label: 'projectfu-theme.color-control-active-border.label', type: 'color' },
	colorControlActiveFill1: { label: 'projectfu-theme.color-control-active-fill-1.label', type: 'color' },
	colorControlActiveFill2: { label: 'projectfu-theme.color-control-active-fill-2.label', type: 'color' },

	/* Apps - Default */
	colorAppBorder: { label: 'projectfu-theme.color-app-border.label', type: 'color' },

	/* Apps - Header */
	colorAppHeaderContent: { label: 'projectfu-theme.color-app-header-content.label', type: 'color' },
	colorAppHeaderFocusContent: { label: 'projectfu-theme.color-app-header-focus-content.label', type: 'color' },
	colorAppHeaderFill1: { label: 'projectfu-theme.color-app-header-fill-1.label', type: 'color' },
	colorAppHeaderFill2: { label: 'projectfu-theme.color-app-header-fill-2.label', type: 'color' },

	/* Apps - Name Section */
	colorAppNameSectionContent: { label: 'projectfu-theme.color-app-name-section-content.label', type: 'color' },
	colorAppNameSectionShadow: { label: 'projectfu-theme.color-app-name-section-shadow.label', type: 'color' },
	colorAppNameSectionFill1: { label: 'projectfu-theme.color-app-name-section-fill-1.label', type: 'color' },
	colorAppNameSectionFill2: { label: 'projectfu-theme.color-app-name-section-fill-2.label', type: 'color' },

	/* Apps - Body */
	colorAppBodyContent: { label: 'projectfu-theme.color-app-body-content.label', type: 'color' },
	colorAppBodyContentSecondary: { label: 'projectfu-theme.color-app-body-content-secondary.label', type: 'color' },
	colorAppBodyPrimaryFill1: { label: 'projectfu-theme.color-app-body-primary-fill-1.label', type: 'color' },
	colorAppBodyPrimaryFill2: { label: 'projectfu-theme.color-app-body-primary-fill-2.label', type: 'color' },

	/* Apps - Controls */
	colorAppControlContent: { label: 'projectfu-theme.color-app-control-content.label', type: 'color' },
	colorAppControlFocusContent: { label: 'projectfu-theme.color-app-control-focus-content.label', type: 'color' },
	colorAppControlBorder: { label: 'projectfu-theme.color-app-control-border.label', type: 'color' },
	colorAppControlShadow: { label: 'projectfu-theme.color-app-control-shadow.label', type: 'color' },
	colorAppControlFill1: { label: 'projectfu-theme.color-app-control-fill-1.label', type: 'color' },
	colorAppControlFill2: { label: 'projectfu-theme.color-app-control-fill-2.label', type: 'color' },
	colorAppControlHighlightContent: { label: 'projectfu-theme.color-app-control-highlight-content.label', type: 'color' },
	colorAppControlHighlightBorder: { label: 'projectfu-theme.color-app-control-highlight-border.label', type: 'color' },
	colorAppControlHighlightShadow: { label: 'projectfu-theme.color-app-control-highlight-shadow.label', type: 'color' },
	colorAppControlHighlightFill1: { label: 'projectfu-theme.color-app-control-highlight-fill-1.label', type: 'color' },
	colorAppControlHighlightFill2: { label: 'projectfu-theme.color-app-control-highlight-fill-2.label', type: 'color' },
	colorAppControlActiveContent: { label: 'projectfu-theme.color-app-control-active-content.label', type: 'color' },
	colorAppControlActiveBorder: { label: 'projectfu-theme.color-app-control-active-border.label', type: 'color' },
	colorAppControlActiveShadow: { label: 'projectfu-theme.color-app-control-active-shadow.label', type: 'color' },
	colorAppControlActiveFill1: { label: 'projectfu-theme.color-app-control-active-fill-1.label', type: 'color' },
	colorAppControlActiveFill2: { label: 'projectfu-theme.color-app-control-active-fill-2.label', type: 'color' },

	/* Apps - Item Header */
	colorAppItemHeaderContent: { label: 'projectfu-theme.color-app-item-header-content.label', type: 'color' },
	colorAppItemHeaderContentFocus: { label: 'projectfu-theme.color-app-item-header-content-focus.label', type: 'color' },
	colorAppItemHeaderFill1: { label: 'projectfu-theme.color-app-item-header-fill-1.label', type: 'color' },
	colorAppItemHeaderFill2: { label: 'projectfu-theme.color-app-item-header-fill-2.label', type: 'color' },
	colorAppItemHeaderShadow: { label: 'projectfu-theme.color-app-item-header-shadow.label', type: 'color' },
	colorAppItemHighlightBorder: { label: 'projectfu-theme.color-app-item-highlight-border.label', type: 'color' },
	colorAppItemHighlightFill1: { label: 'projectfu-theme.color-app-item-highlight-fill-1.label', type: 'color' },
	colorAppItemHighlightFill2: { label: 'projectfu-theme.color-app-item-highlight-fill-2.label', type: 'color' },

	/* Apps - Clock */
	colorAppClockBorder: { label: 'projectfu-theme.color-app-clock-border.label', type: 'color' },
	colorAppClockFill1: { label: 'projectfu-theme.color-app-clock-fill-1.label', type: 'color' },
	colorAppClockFill2: { label: 'projectfu-theme.color-app-clock-fill-2.label', type: 'color' },
	colorAppClockBg1: { label: 'projectfu-theme.color-app-clock-bg-1.label', type: 'color' },
	colorAppClockBg2: { label: 'projectfu-theme.color-app-clock-bg-2.label', type: 'color' },

	/* Apps - Image */
	colorAppImageFill1: { label: 'projectfu-theme.color-app-image-fill-1.label', type: 'color' },
	colorAppImageFill2: { label: 'projectfu-theme.color-app-image-fill-2.label', type: 'color' },

	/* Apps - Section */
	colorAppSectionContentPrimary: { label: 'projectfu-theme.color-app-section-content-primary.label', type: 'color' },
	colorAppSectionContentSecondary: { label: 'projectfu-theme.color-app-section-content-secondary.label', type: 'color' },
	colorAppSectionContentTertiary: { label: 'projectfu-theme.color-app-section-content-tertiary.label', type: 'color' },
	colorAppSectionBorder: { label: 'projectfu-theme.color-app-section-border.label', type: 'color' },
	colorAppSectionPrimaryFill1: { label: 'projectfu-theme.color-app-section-primary-fill-1.label', type: 'color' },
	colorAppSectionPrimaryFill2: { label: 'projectfu-theme.color-app-section-primary-fill-2.label', type: 'color' },

	/* Apps - Detail Section */
	colorAppDetailSectionContentPrimary: { label: 'projectfu-theme.color-app-detail-section-content-primary.label', type: 'color' },
	colorAppDetailSectionContentSecondary: { label: 'projectfu-theme.color-app-detail-section-content-secondary.label', type: 'color' },
	colorAppDetailSectionContentTertiary: { label: 'projectfu-theme.color-app-detail-section-content-tertiary.label', type: 'color' },
	colorAppDetailSectionShadow: { label: 'projectfu-theme.color-app-detail-section-shadow.label', type: 'color' },
	colorAppDetailSectionPrimaryFill1: { label: 'projectfu-theme.color-app-detail-section-primary-fill-1.label', type: 'color' },
	colorAppDetailSectionPrimaryFill2: { label: 'projectfu-theme.color-app-detail-section-primary-fill-2.label', type: 'color' },

	/* Apps - Scrollbar */
	colorAppScrollbar: { label: 'projectfu-theme.color-app-scrollbar.label', type: 'color' },
	colorAppScrollbarTrack: { label: 'projectfu-theme.color-app-scrollbar-track.label', type: 'color' },

	/* Combat HUD */
	colorHudBackgroundFill1: { label: 'projectfu-theme.color-hud-background-fill-1.label', type: 'color' },
	colorHudBackgroundFill2: { label: 'projectfu-theme.color-hud-background-fill-2.label', type: 'color' },

	/* Misc */
	colorMiscShadowPrimary: { label: 'projectfu-theme.color-misc-shadow-primary.label', type: 'color' },
	colorMiscShadowHighlight: { label: 'projectfu-theme.color-misc-shadow-highlight.label', type: 'color' },
	colorMiscBorderHighlight: { label: 'projectfu-theme.color-misc-border-highlight.label', type: 'color' },

	/* Images */
	uiAccentImage: { label: 'projectfu-theme.ui-accent-image.label', type: 'image' },
	appAccentImage: { label: 'projectfu-theme.app-accent-image.label', type: 'image' },
	appBgImage: { label: 'projectfu-theme.app-bg-image.label', type: 'image' },
	appSectionBgImage: { label: 'projectfu-theme.app-section-bg-image.label', type: 'image' },
	sidebarBgImage: { label: 'projectfu-theme.sidebar-bg-image.label', type: 'image' },

	/* Advanced */
	advanced: {
		label: 'projectfu-theme.advanced.label',
		hint: 'projectfu-theme.advanced.hint',
		type: 'multiline-text',
	},
});

/**
 * @type {Record<String, ThemeOptions>}
 */
export const THEMES = ObjectUtils.deepFreeze({
	Default: {
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
		appAccentImage: systemPath(`ui/Acento_highres.png`),
		appBgImage: systemPath(`ui/HojitasDouble_highres.png`),
		appSectionBgImage: systemPath(`ui/Bkg_highres.png`),
		sidebarBgImage: systemPath(`ui/Hojitas_highres.png`),

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
	},
	BlueTechno: {
		colorControlContent: '#F7FEFFFF',
		colorControlBorder: '#ADC9FF80',
		colorControlFocusContent: '#F7FEFFFF',
		colorControlInactiveContent: '#F7FEFF80',
		colorControlFill1: '#2D388599',
		colorControlFill2: '#4758D199',

		colorControlHighlightContent: '#3C4685FF',
		colorControlHighlightBorder: '#6F83D1FF',
		colorControlHighlightFill1: '#D9ECFFFF',
		colorControlHighlightFill2: '#F7FEFFFF',

		colorControlActiveContent: '#F7FEFFFF',
		colorControlActiveBorder: '#F7FEFFB3',
		colorControlActiveFill1: '#7D7D7DCC',
		colorControlActiveFill2: '#E3E3E3CC',

		colorAppBorder: '#00000000',

		colorAppHeaderContent: '#F7FEFFFF',
		colorAppHeaderFocusContent: '#FFFFFFFF',
		colorAppHeaderFill1: '#3A4587DD',
		colorAppHeaderFill2: '#0F1224DD',

		colorAppBodyContent: '#F7FEFFFF',
		colorAppBodyContentSecondary: '#F7FEFFC0',
		colorAppBodyPrimaryFill1: '#101129FF',
		colorAppBodyPrimaryFill2: '#28275CFF',

		colorAppNameSectionContent: '#F7FEFFFF',
		colorAppNameSectionShadow: '#000000FF',
		colorAppNameSectionFill1: '#532853FF',
		colorAppNameSectionFill2: '#5328538C',

		colorAppControlContent: '#D6F9FFFF',
		colorAppControlBorder: '#D6F9FF5C',
		colorAppControlShadow: '#2D3885FF',
		colorAppControlFill1: '#2D3885FF',
		colorAppControlFill2: '#2D3885FF',
		colorAppControlHighlightContent: '#2D3885FF',
		colorAppControlHighlightBorder: '#2D3885FF',
		colorAppControlHighlightShadow: '#2D3885FF',
		colorAppControlHighlightFill1: '#D6F9FFFF',
		colorAppControlHighlightFill2: '#D6F9FFFF',
		colorAppControlActiveContent: '#2D3885FF',
		colorAppControlActiveBorder: '#2D3885FF',
		colorAppControlActiveShadow: '#2D3885FF',
		colorAppControlActiveFill1: '#D6F9FFFF',
		colorAppControlActiveFill2: '#D6F9FFFF',

		colorAppImageFill1: '#303573FF',
		colorAppImageFill2: '#3A49A1FF',

		colorAppItemHeaderContent: '#F8F7FFFF',
		colorAppItemHeaderContentFocus: '#D6F9FFFF',
		colorAppItemHeaderFill1: '#2D3885FF',
		colorAppItemHeaderFill2: '#A1DAFFFF',
		colorAppItemHeaderShadow: '#2D3885FF',
		colorAppItemHighlightBorder: '#2D3885FF',
		colorAppItemHighlightFill1: '#D6F9FFFF',
		colorAppItemHighlightFill2: '#D6F9FF00',

		colorAppClockBorder: '#1E2559FF',
		colorAppClockFill1: '#2D3885E0',
		colorAppClockFill2: '#2D3885E0',
		colorAppClockBg1: '#FFFFFFB0',
		colorAppClockBg2: '#FFFFFFB0',

		colorAppDetailSectionContentPrimary: '#272A2AFF',
		colorAppDetailSectionContentSecondary: '#1E2559FF',
		colorAppDetailSectionContentTertiary: '#4B4A44FF',
		colorAppDetailSectionBorder: '#c9c7b8ff',
		colorAppDetailSectionShadow: '#2D3885FF',
		colorAppDetailSectionLabel: '#2b4a42ff',
		colorAppDetailSectionPrimaryFill1: '#D6F9FFFF',
		colorAppDetailSectionPrimaryFill2: '#D6F9FFA3',

		colorAppSectionContentPrimary: '#191813FF',
		colorAppSectionContentSecondary: '#1E2559FF',
		colorAppSectionContentTertiary: '#4B4A44FF',
		colorAppSectionBorder: '#F8F7FFE0',
		colorAppSectionPrimaryFill1: '#F8F7FFE0',
		colorAppSectionPrimaryFill2: '#F5F5FFED',

		colorAppScrollbar: '#F8F7FFE0',
		colorAppScrollbarTrack: '',

		colorHudBackgroundFill1: '#2D3885FF',
		colorHudBackgroundFill2: '#2D3885FF',

		uiAccentImage: '',
		appAccentImage: '',
		appBgImage: systemPath('ui/Page_deco.png'),
		appSectionBgImage: '',
		sidebarBgImage: systemPath('ui/Page_deco_half.png'),

		colorMiscShadowPrimary: '#73BEFFFF',
		colorMiscShadowHighlight: '#F78946FF',
		colorMiscBorderHighlight: '#F78946CC',

		advanced:
			':root {\n  --pfu-ui-accent-width: 70px;\n  --pfu-ui-accent-height: auto;\n  --pfu-ui-accent-position-top: -111px;\n  --pfu-ui-accent-position-left: 72px;\n  --pfu-ui-accent-clip-path: unset;\n  --pfu-border-radius-large: 20px;\n  --pfu-border-radius-medium: 10px;\n  --pfu-border-radius-small: 5px;\n  --pfu-border-width: 0.1em;\n  --pfu-control-shadow: 0 0 10px var(--color-shadow-dark);\n}\n\n#ui-accent {\n  transform: rotate(90deg) scaleY(-1);\n}\n\n#chat-form #chat-message {\n  background: var(--pfu-color-app-section-primary-fill);\n}',
	},
});
