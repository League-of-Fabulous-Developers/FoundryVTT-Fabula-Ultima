import { CombatHUD } from './ui/combat-hud.mjs';

export const SYSTEM = 'projectfu';

export const SETTINGS = Object.freeze({
	optionQuirks: 'optionQuirks',
	optionZeroPower: 'optionZeroPower',
	optionCampingRules: 'optionCampingRules',
	optionBehaviorRoll: 'optionBehaviorRoll',
	optionTargetPriority: 'optionTargetPriority',
	collapseDescriptions: 'collapseDescriptions',
	experimentalCombatTracker: 'experimentalCombatTracker',
	optionCombatMouseDown: 'optionCombatMouseDown',
	optionStudySavePath: 'optionStudySavePath',
	useRevisedStudyRule: 'useRevisedStudyRule',
	optionImagePixelated: 'optionImagePixelated',
	optionAlwaysFavorite: 'optionAlwaysFavorite',
	optionNPCNotesTab: 'optionNPCNotesTab',
	experimentalCombatHud: 'experimentalCombatHud',
	optionCombatHudCompact: 'optionCombatHudCompact',
	optionCombatHudMinimized: 'optionCombatHudMinimized',
	optionCombatHudOpacity: 'optionCombatHudOpacity',
	optionCombatHudWidth: 'optionCombatHudWidth',
	optionCombatHudPosition: 'optionCombatHudPosition',
	optionCombatHudPortrait: 'optionCombatHudPortrait',
	optionCombatHudShowEffects: 'optionCombatHudShowEffects',
	optionCombatHudEffectsMarqueeDuration: 'optionCombatHudEffectsMarqueeDuration',
	optionCombatHudEffectsMarqueeMode: 'optionCombatHudEffectsMarqueeMode',
	optionCombatHudReordering: 'optionCombatHudReordering',
	optionCombatHudShowOrderNumbers: 'optionCombatHudShowOrderNumbers',
	optionCombatHudActorOrdering: 'optionCombatHudActorOrdering',
	optionCombatHudDraggedPosition: 'optionCombatHudDraggedPosition',
});

export const registerSystemSettings = async function () {
	game.settings.registerMenu(SYSTEM, 'myOptionalRules', {
		name: game.i18n.localize('FU.OptionalRules'),
		label: game.i18n.localize('FU.OptionalRulesManage'),
		hint: game.i18n.localize('FU.OptionalRulesSettingsInstuction'),
		icon: 'fas fa-book',
		type: OptionalRules,
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionQuirks, {
		name: game.i18n.localize('FU.QuirksSettings'),
		hint: game.i18n.localize('FU.QuirksSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionZeroPower, {
		name: game.i18n.localize('FU.ZeroPowerSettings'),
		hint: game.i18n.localize('FU.ZeroPowerSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCampingRules, {
		name: game.i18n.localize('FU.CampingActivitiesSettings'),
		hint: game.i18n.localize('FU.CampingActivitiesSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionBehaviorRoll, {
		name: game.i18n.localize('FU.BehaviorRollsSettings'),
		hint: game.i18n.localize('FU.BehaviorRollsSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
		requiresReload: true,
	});
	game.i18n.localize('FU.BehaviorRollsSettings'),
	game.i18n.localize('FU.BehaviorRollsSettingsHint'),

	game.settings.registerMenu(SYSTEM, 'myBehaviorRolls', {
		name: game.i18n.localize('FU.BehaviorRolls'),
		label: game.i18n.localize('FU.BehaviorRollsManage'),
		hint: game.i18n.localize('FU.BehaviorRollsManageHint'),
		icon: 'fas fa-book',
		type: myBehaviorRolls,
		restricted: true,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionTargetPriority, {
		name: game.i18n.localize('FU.TotalPartyMemberSettings'),
		hint: game.i18n.localize('FU.TotalPartyMemberSettingsHint'),
		scope: 'world',
		config: false,
		type: Number,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.collapseDescriptions, {
		name: game.i18n.localize('FU.CollapseDescriptionSettings'),
		hint: game.i18n.localize('FU.CollapseDescriptionSettingsHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.experimentalCombatTracker, {
		name: game.i18n.localize('FU.ExperimentalCombatTracker'),
		hint: game.i18n.localize('FU.ExperimentalCombatTrackerHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatMouseDown, {
		name: game.i18n.localize('FU.CombatHudPanTokenSettings'),
		hint: game.i18n.localize('FU.CombatHudPanTokenSettingsHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.useRevisedStudyRule, {
		name: game.i18n.localize('FU.RevisedStudyRollSettings'),
		hint: game.i18n.localize('FU.RevisedStudyRollSettingsHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionStudySavePath, {
		name: game.i18n.localize('FU.StudySavePathSettings'),
		hint: game.i18n.localize('FU.StudySavePathSettingsHint'),
		scope: 'world',
		config: true,
		type: String
	});	

	game.settings.register(SYSTEM, SETTINGS.optionImagePixelated, {
		name: game.i18n.localize('FU.PixelatedViewSettings'),
		hint: game.i18n.localize('FU.PixelatedViewSettingsHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionAlwaysFavorite, {
		name: game.i18n.localize('FU.AlwaysFavoriteSettings'),
		hint: game.i18n.localize('FU.AlwaysFavoriteSettingsHint'),
		scope: 'client',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionNPCNotesTab, {
		name: game.i18n.localize('FU.NotesTabSettings'),
		hint: game.i18n.localize('FU.NotesTabSettingsHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.registerMenu(SYSTEM, "combatHudSettings", {
		name: game.i18n.localize('FU.ExperimentalCombatHudSettings'),
		hint: game.i18n.localize('FU.ExperimentalCombatHudSettingsHint'),
		label: game.i18n.localize('FU.ExperimentalCombatHudSettingsLabel'),
		scope: 'client',
		icon: 'fas fa-book',
		type: CombatHudSettings,
	});

	game.settings.register(SYSTEM, SETTINGS.experimentalCombatHud, {
		name: game.i18n.localize('FU.ExperimentalCombatHud'),
		hint: game.i18n.localize('FU.ExperimentalCombatHudHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudOpacity, {
		name: game.i18n.localize('FU.CombatHudOpacity'),
		hint: game.i18n.localize('FU.CombatHudOpacityHint'),
		scope: 'client',
		config: false,
		type: Number,
		default: 100,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudWidth, {
		name: game.i18n.localize('FU.CombatHudWidth'),
		hint: game.i18n.localize('FU.CombatHudWidthHint'),
		scope: 'client',
		config: false,
		type: Number,
		default: 100,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudPosition, {
		name: game.i18n.localize('FU.CombatHudPosition'),
		hint: game.i18n.localize('FU.CombatHudPositionHint'),
		scope: 'client',
		config: false,
		type: String,
		default: 'bottom',
		choices: {
			'bottom': game.i18n.localize('FU.CombatHudPositionBottom'),
			'top': game.i18n.localize('FU.CombatHudPositionTop'),
		},
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudPortrait, {
		name: game.i18n.localize('FU.CombatHudPortrait'),
		hint: game.i18n.localize('FU.CombatHudPortraitHint'),
		scope: 'client',
		config: false,
		type: String,
		default: 'actor',
		choices: {
			'actor': game.i18n.localize('FU.CombatHudPortraitActor'),
			'token': game.i18n.localize('FU.CombatHudPortraitToken'),
		},
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudCompact, {
		name: "CombatHudCompact",
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudMinimized, {
		name: "CombatHudMinimized",
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudShowEffects, {
		name: game.i18n.localize('FU.CombatHudShowEffects'),
		hint: game.i18n.localize('FU.CombatHudShowEffectsHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration, {
		name: game.i18n.localize('FU.CombatHudEffectsMarqueeDuration'),
		hint: game.i18n.localize('FU.CombatHudEffectsMarqueeDurationHint'),
		scope: 'client',
		config: false,
		type: Number,
		default: 15,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode, {
		name: game.i18n.localize('FU.CombatHudEffectsMarqueeMode'),
		hint: game.i18n.localize('FU.CombatHudEffectsMarqueeModeHint'),
		scope: 'client',
		config: false,
		type: String,
		default: 'alternate',
		choices: {
			'normal': game.i18n.localize('FU.CombatHudEffectsMarqueeModeNormal'),
			'alternate': game.i18n.localize('FU.CombatHudEffectsMarqueeModeAlternate'),
		},
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudReordering, {
		name: game.i18n.localize('FU.CombatHudReordering'),
		hint: game.i18n.localize('FU.CombatHudReorderingHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudShowOrderNumbers, {
		name: game.i18n.localize('FU.CombatHudShowOrderNumbers'),
		hint: game.i18n.localize('FU.CombatHudShowOrderNumbersHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudActorOrdering, {
		name: game.i18n.localize('FU.CombatHudActorOrdering'),
		hint: game.i18n.localize('FU.CombatHudActorOrderingHint'),
		scope: 'world',
		config: false,
		type: Array,
		default: [],
		restricted: true,
		onChange: value => {
			CombatHUD.update();
		}
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudDraggedPosition, {
		name: game.i18n.localize('FU.CombatHudDraggedPosition'),
		hint: game.i18n.localize('FU.CombatHudDraggedPositionHint'),
		scope: 'client',
		config: false,
		type: Object,
		default: {},
	});
};

class OptionalRules extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			template: 'systems/projectfu/templates/system/settings/optional-rules.hbs',
		});
	}

	getData() {
		return {
			optionQuirks: game.settings.get(SYSTEM, SETTINGS.optionQuirks),
			optionZeroPower: game.settings.get(SYSTEM, SETTINGS.optionZeroPower),
			optionCampingRules: game.settings.get(SYSTEM, SETTINGS.optionCampingRules),
		};
	}

	async _updateObject(event, formData) {
		const { optionQuirks, optionZeroPower, optionCampingRules } = foundry.utils.expandObject(formData);
		game.settings.set(SYSTEM, SETTINGS.optionQuirks, optionQuirks);
		game.settings.set(SYSTEM, SETTINGS.optionZeroPower, optionZeroPower);
		game.settings.set(SYSTEM, SETTINGS.optionCampingRules, optionCampingRules);
	}
}

class myBehaviorRolls extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			template: 'systems/projectfu/templates/system/settings/behavior-rolls.hbs',
		});
	}

	getData() {
		return {
			optionBehaviorRoll: game.settings.get(SYSTEM, SETTINGS.optionBehaviorRoll),
			optionTargetPriority: game.settings.get(SYSTEM, SETTINGS.optionTargetPriority),
		};
	}

	async _updateObject(event, formData) {
		const { optionBehaviorRoll, optionTargetPriority } = expandObject(formData);
		game.settings.set(SYSTEM, SETTINGS.optionBehaviorRoll, optionBehaviorRoll);
		game.settings.set(SYSTEM, SETTINGS.optionTargetPriority, optionTargetPriority);
	}
}

class CombatHudSettings extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			template: 'systems/projectfu/templates/system/settings/combat-hud.hbs',
		});
	}

	getData() {
		return {
			experimentalCombatHud: game.settings.get(SYSTEM, SETTINGS.experimentalCombatHud),
			optionCombatHudOpacity: game.settings.get(SYSTEM, SETTINGS.optionCombatHudOpacity),
			optionCombatHudWidth: game.settings.get(SYSTEM, SETTINGS.optionCombatHudWidth),
			optionCombatHudPosition: game.settings.get(SYSTEM, SETTINGS.optionCombatHudPosition),
			optionCombatHudPortrait: game.settings.get(SYSTEM, SETTINGS.optionCombatHudPortrait),
			optionCombatHudShowEffects: game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowEffects),
			optionCombatHudEffectsMarqueeDuration: game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration),
			optionCombatHudEffectsMarqueeMode: game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode),
			optionCombatHudReordering: game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering),
			optionCombatHudShowOrderNumbers: game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowOrderNumbers),
			isGM: game.user.isGM,
		}
	}

	async _updateObject(event, formData) {
		if (game.user.isGM) {
			const { 
				experimentalCombatHud, 
				optionCombatHudOpacity, 
				optionCombatHudWidth, 
				optionCombatHudPosition, 
				optionCombatHudPortrait,
				optionCombatHudShowEffects,
				optionCombatHudEffectsMarqueeDuration,
				optionCombatHudEffectsMarqueeMode,
				optionCombatHudReordering,
				optionCombatHudShowOrderNumbers,
			} = expandObject(formData);

			game.settings.set(SYSTEM, SETTINGS.experimentalCombatHud, experimentalCombatHud);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudOpacity, optionCombatHudOpacity);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudWidth, optionCombatHudWidth);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPosition, optionCombatHudPosition);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPortrait, optionCombatHudPortrait);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowEffects, optionCombatHudShowEffects);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration, optionCombatHudEffectsMarqueeDuration);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode, optionCombatHudEffectsMarqueeMode);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudReordering, optionCombatHudReordering);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowOrderNumbers, optionCombatHudShowOrderNumbers);
		} else {
			const { 
				experimentalCombatHud, 
				optionCombatHudOpacity, 
				optionCombatHudWidth, 
				optionCombatHudPosition, 
				optionCombatHudPortrait,
				optionCombatHudShowEffects,
				optionCombatHudEffectsMarqueeDuration,
				optionCombatHudEffectsMarqueeMode,
				optionCombatHudShowOrderNumbers,
			} = expandObject(formData);

			game.settings.set(SYSTEM, SETTINGS.experimentalCombatHud, experimentalCombatHud);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudOpacity, optionCombatHudOpacity);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudWidth, optionCombatHudWidth);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPosition, optionCombatHudPosition);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudPortrait, optionCombatHudPortrait);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowEffects, optionCombatHudShowEffects);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration, optionCombatHudEffectsMarqueeDuration);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode, optionCombatHudEffectsMarqueeMode);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudShowOrderNumbers, optionCombatHudShowOrderNumbers);
		}

		const isCustomTrackerActive = game.settings.get(SYSTEM, SETTINGS.experimentalCombatTracker);
		if (!isCustomTrackerActive && experimentalCombatHud) {
			const enableTracker = await Dialog.confirm({
				title: game.i18n.localize('FU.ExperimentalCombatHudWarningNoCombatTrackerTitle'),
				content: game.i18n.localize('FU.ExperimentalCombatHudWarningNoCombatTrackerContent')
			});

			if (enableTracker) {
				game.settings.set(SYSTEM, SETTINGS.experimentalCombatTracker, true);
			}
		}

		await SettingsConfig.reloadConfirm({ world: game.user.isGM });
	}
}