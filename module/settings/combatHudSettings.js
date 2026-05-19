import FUApplication from '../ui/application.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { systemTemplatePath } from '../helpers/system-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { BaseCombatHUD } from '../ui/combat-hud/base-combat-hud.mjs';

export class CombatHudSettings extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'combat-hud-config-app', 'sheet', 'backgroundstyle'],
		id: 'combat-hud-settings',
		position: {
			width: 600,
		},
		form: {
			closeOnSubmit: true,
			submitOnChange: false,
			handler: CombatHudSettings.#save,
		},
		actions: {
			resetPosition: CombatHudSettings.ResetPosition,
			openUserConfig: CombatHudSettings.OpenUserConfig,
		},
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		tabs: {
			template: systemTemplatePath('app/settings/combat-hud/combat-hud-tabs'),
		},
		basics: {
			template: systemTemplatePath('app/settings/combat-hud/combat-hud-basics'),
		},
		appearance: {
			template: systemTemplatePath('app/settings/combat-hud/combat-hud-appearance'),
		},
		trackedResources: {
			template: systemTemplatePath('app/settings/combat-hud/combat-hud-resources'),
		},

		buttons: {
			template: systemTemplatePath('app/settings/combat-hud/combat-hud-buttons'),
		},
	};

	static TABS = {
		primary: {
			tabs: [
				{
					id: 'basics',
					label: 'FU.COMBATHUD.TABS.Basics',
					class: ['button-style'],
				},
				{
					id: 'appearance',
					label: 'FU.COMBATHUD.TABS.Appearance',
				},
				{
					id: 'trackedResources',
					label: 'FU.COMBATHUD.TABS.TrackedResources',
				},
			],

			initial: 'basics',
		},
	};

	/**
	 * @this {CombatHudSettings}
	 */
	static OpenUserConfig() {
		game.user.sheet.render({ force: true });
		Hooks.once('closeUserConfig', () => {
			this.render();
		});
	}

	static async ResetPosition() {
		await game.settings.set(SYSTEM, SETTINGS.optionCombatHudDraggedPosition, { x: 0, y: 0 });
		if (ui.combatHud) await ui.combatHud.render();
	}

	async _onRender(context, options) {
		this.element.querySelectorAll('.mats-icon-picker').forEach((el) =>
			el.addEventListener('change', (event) => {
				event.preventDefault();
				el.parentNode.querySelector('.mats-o').textContent = el.value;
			}),
		);
	}

	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		if (partId in context.tabs) context.tab = context.tabs[partId];
		return context;
	}

	_getLocalizedResource(resource) {
		const localizationString = FU.combatHudResources[resource];
		if (localizationString) return game.i18n.localize(localizationString);
		return resource;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		Object.assign(context, this.getData());

		context.tabs = this._prepareTabs('primary');

		context.hasCharacter = !!game.user.character;
		context.userCharacter = game.user.character;

		const trackedResources = game.user.character?.getFlag(Flags.Scope, Flags.Actor.combatHud.trackedResources) ?? ['default', 'default', 'default', 'default'];

		for (let i = 0; i < 4; i++) {
			context[`trackedActorResource${i + 1}`] = trackedResources[i] ?? 'default';
			context[`trackedActorResources${i + 1}`] = {
				default: game.i18n.format('FU.CombatHudTrackedActorResourceUseDefault', { value: this._getLocalizedResource(game.settings.get(SYSTEM, SETTINGS[`optionCombatHudTrackedPCResource${i + 1}`])) }),
				...FU.combatHudResources,
			};
		}

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
			optionCombatHudTrackedPCResource1: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource1),
			optionCombatHudTrackedPCResource2: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource2),
			optionCombatHudTrackedPCResource3: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource3),
			optionCombatHudTrackedPCResource4: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource4),
			optionCombatHudTrackedNPCResource1: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource1),
			optionCombatHudTrackedNPCResource2: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource2),
			optionCombatHudTrackedNPCResource3: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource3),
			optionCombatHudTrackedNPCResource4: game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource4),
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
			optionCombatHudShowNPCResourcesMode: game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowNPCResourcesMode),
			optionCombatHudShowNPCResourcesModeOptions: {
				never: 'FU.CombatHudShowNPCResourcesModeNever',
				always: 'FU.CombatHudShowNPCResourcesModeAlways',
				'only-gm': 'FU.CombatHudShowNPCResourcesModeOnlyGM',
				'only-studied': 'FU.CombatHudShowNPCResourcesModeOnlyStudied',
			},
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
				optionCombatHudTrackedPCResource1,
				optionCombatHudTrackedPCResource2,
				optionCombatHudTrackedPCResource3,
				optionCombatHudTrackedPCResource4,
				optionCombatHudTrackedNPCResource1,
				optionCombatHudTrackedNPCResource2,
				optionCombatHudTrackedNPCResource3,
				optionCombatHudTrackedNPCResource4,
				optionCombatHudTurnIconsActive,
				optionCombatHudTurnIconsOutOfTurns,
				optionCombatHudTurnIconsTurnsLeftHidden,
				optionCombatHudTheme,
				optionCombatHudShowNPCTurnsLeftMode,
				optionCombatHudShowNPCResourcesMode,
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

			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource1, optionCombatHudTrackedPCResource1);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource2, optionCombatHudTrackedPCResource2);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource3, optionCombatHudTrackedPCResource3);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedPCResource4, optionCombatHudTrackedPCResource4);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource1, optionCombatHudTrackedNPCResource1);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource2, optionCombatHudTrackedNPCResource2);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource3, optionCombatHudTrackedNPCResource3);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTrackedNPCResource4, optionCombatHudTrackedNPCResource4);

			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTheme, optionCombatHudTheme);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowNPCTurnsLeftMode, optionCombatHudShowNPCTurnsLeftMode);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTurnIconsActive, optionCombatHudTurnIconsActive);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTurnIconsOutOfTurns, optionCombatHudTurnIconsOutOfTurns);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudTurnIconsTurnsLeftHidden, optionCombatHudTurnIconsTurnsLeftHidden);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowNPCResourcesMode, optionCombatHudShowNPCResourcesMode);
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
				trackedActorResource1,
				trackedActorResource2,
				trackedActorResource3,
				trackedActorResource4,
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

			if (game.user.character) {
				await game.user.character.setFlag(Flags.Scope, Flags.Actor.combatHud.trackedResources, [trackedActorResource1, trackedActorResource2, trackedActorResource3, trackedActorResource4]);
			}
		}

		BaseCombatHUD.implementation.update();
		// await foundry.applications.settings.SettingsConfig.reloadConfirm({ world: game.user.isGM });
	}
}
