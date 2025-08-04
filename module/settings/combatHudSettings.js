import FUApplication from '../ui/application.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';

export class CombatHudSettings extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'combat-hud-config-app'],
		id: 'combat-hud-settings',
		position: {
			width: 600,
		},
		form: {
			closeOnSubmit: true,
			submitOnChange: false,
			handler: CombatHudSettings.#save,
		},
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/app/settings/combat-hud.hbs',
		},
	};

	async _onRender(context, options) {
		this.element.querySelectorAll('.mats-icon-picker').forEach((el) =>
			el.addEventListener('change', (event) => {
				event.preventDefault();
				el.parentNode.querySelector('.mats-o').textContent = el.value;
			}),
		);
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		Object.assign(context, this.getData());
		return context;
	}

	getData() {
		const materialSymbolsLabel = game.i18n.localize('FU.CombatHudTurnIconsGoogleMaterialSymbolsLabel');
		const materialSymbolsLink = `<a href="https://fonts.google.com/icons" target="_blank">${materialSymbolsLabel}</a>`;
		return {
			experimentalCombatHud: game.settings.get(SYSTEM, SETTINGS.experimentalCombatHud),
			optionCombatHudOpacity: game.settings.get(SYSTEM, SETTINGS.optionCombatHudOpacity),
			optionCombatHudWidth: game.settings.get(SYSTEM, SETTINGS.optionCombatHudWidth),
			optionCombatHudPositionButton: game.settings.get(SYSTEM, SETTINGS.optionCombatHudPositionButton),
			optionCombatHudPositionButtonOptions: {
				bottom: 'FU.CombatHudPositionBottom',
				top: 'FU.CombatHudPositionTop',
			},
			optionCombatHudPosition: game.settings.get(SYSTEM, SETTINGS.optionCombatHudPosition),
			optionCombatHudPositionOptions: { bottom: 'FU.CombatHudPositionBottom', top: 'FU.CombatHudPositionTop' },
			optionCombatHudPortrait: game.settings.get(SYSTEM, SETTINGS.optionCombatHudPortrait),
			optionCombatHudPortraitOptions: { actor: 'FU.CombatHudPortraitActor', token: 'FU.CombatHudPortraitToken' },
			optionCombatHudShowEffects: game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowEffects),
			optionCombatHudEffectsMarqueeDuration: game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration),
			optionCombatHudEffectsMarqueeMode: game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode),
			optionCombatHudEffectsMarqueeModeOptions: {
				normal: 'FU.CombatHudEffectsMarqueeModeNormal',
				alternate: 'FU.CombatHudEffectsMarqueeModeAlternate',
			},
			optionCombatHudReordering: game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering),
			optionCombatHudShowOrderNumbers: game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowOrderNumbers),
			isGM: game.user.isGM,
			optionCombatHudTrackedResource1: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource1),
			optionCombatHudTrackedResource2: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource2),
			optionCombatHudTrackedResource3: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource3),
			optionCombatHudTrackedResource4: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource4),
			optionCombatHudTurnIconsActive: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTurnIconsActive),
			optionCombatHudTurnIconsOutOfTurns: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTurnIconsOutOfTurns),
			optionCombatHudTurnIconsTurnsLeftHidden: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTurnIconsTurnsLeftHidden),
			trackedResources: FU.combatHudResources,
			optionCombatHudTheme: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme),
			optionCombatHudThemeOptions: FU.combatHudThemes,
			optionCombatHudShowNPCTurnsLeftMode: game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowNPCTurnsLeftMode),
			optionCombatHudShowNPCTurnsLeftModeOptions: {
				never: 'FU.CombatHudShowNPCTurnsLeftModeNever',
				always: 'FU.CombatHudShowNPCTurnsLeftModeAlways',
				'only-studied': 'FU.CombatHudShowNPCTurnsLeftModeOnlyStudied',
			},
			combatHudTurnIconsHint: new Handlebars.SafeString(game.i18n.format('FU.CombatHudTurnIconsHint', { materialSymbolsLink: materialSymbolsLink })),
		};
	}

	static async #save(event, form, formData) {
		if (game.user.isGM) {
			const {
				experimentalCombatHud,
				optionCombatHudOpacity,
				optionCombatHudWidth,
				optionCombatHudPositionButton,
				optionCombatHudPosition,
				optionCombatHudPortrait,
				optionCombatHudShowEffects,
				optionCombatHudEffectsMarqueeDuration,
				optionCombatHudEffectsMarqueeMode,
				optionCombatHudReordering,
				optionCombatHudShowOrderNumbers,
				optionCombatHudTrackedResource1,
				optionCombatHudTrackedResource2,
				optionCombatHudTrackedResource3,
				optionCombatHudTrackedResource4,
				optionCombatHudTurnIconsActive,
				optionCombatHudTurnIconsOutOfTurns,
				optionCombatHudTurnIconsTurnsLeftHidden,
				optionCombatHudTheme,
				optionCombatHudShowNPCTurnsLeftMode,
			} = formData.object;

			game.settings.set(SYSTEM, SETTINGS.experimentalCombatHud, experimentalCombatHud);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudOpacity, optionCombatHudOpacity);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudWidth, optionCombatHudWidth);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPositionButton, optionCombatHudPositionButton);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPosition, optionCombatHudPosition);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPortrait, optionCombatHudPortrait);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowEffects, optionCombatHudShowEffects);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration, optionCombatHudEffectsMarqueeDuration);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode, optionCombatHudEffectsMarqueeMode);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudReordering, optionCombatHudReordering);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowOrderNumbers, optionCombatHudShowOrderNumbers);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedResource1, optionCombatHudTrackedResource1);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedResource2, optionCombatHudTrackedResource2);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedResource3, optionCombatHudTrackedResource3);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedResource4, optionCombatHudTrackedResource4);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTheme, optionCombatHudTheme);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowNPCTurnsLeftMode, optionCombatHudShowNPCTurnsLeftMode);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTurnIconsActive, optionCombatHudTurnIconsActive);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTurnIconsOutOfTurns, optionCombatHudTurnIconsOutOfTurns);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTurnIconsTurnsLeftHidden, optionCombatHudTurnIconsTurnsLeftHidden);
		} else {
			const {
				experimentalCombatHud,
				optionCombatHudOpacity,
				optionCombatHudWidth,
				optionCombatHudPositionButton,
				optionCombatHudPosition,
				optionCombatHudPortrait,
				optionCombatHudShowEffects,
				optionCombatHudEffectsMarqueeDuration,
				optionCombatHudEffectsMarqueeMode,
				optionCombatHudShowOrderNumbers,
			} = formData.object;

			game.settings.set(SYSTEM, SETTINGS.experimentalCombatHud, experimentalCombatHud);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudOpacity, optionCombatHudOpacity);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudWidth, optionCombatHudWidth);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPositionButton, optionCombatHudPositionButton);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPosition, optionCombatHudPosition);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPortrait, optionCombatHudPortrait);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowEffects, optionCombatHudShowEffects);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration, optionCombatHudEffectsMarqueeDuration);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode, optionCombatHudEffectsMarqueeMode);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowOrderNumbers, optionCombatHudShowOrderNumbers);
		}

		await foundry.applications.settings.SettingsConfig.reloadConfirm({ world: game.user.isGM });
	}
}
