import { SYSTEM, FU } from './helpers/config.mjs';
import { MetaCurrencyTrackerApplication } from './ui/metacurrency/MetaCurrencyTrackerApplication.mjs';
import { CombatHUD } from './ui/combat-hud.mjs';
import { FUHooks } from './hooks.mjs';
import { WellspringDataModel } from './documents/items/classFeature/invoker/invoker-integration.mjs';
import FUApplication from './ui/application.mjs';

export const SETTINGS = Object.freeze({
	// Meta Currency
	metaCurrencyAutomaticallyDistributeExp: 'metaCurrencyAutomaticallyDistributeExp',
	metaCurrencyAutomation: 'metaCurrencyAutomation',
	metaCurrencyBaseExperience: 'metaCurrencyBaseExperience',
	metaCurrencyFabula: 'metaCurrencyFabula',
	metaCurrencyUltima: 'metaCurrencyUltima',
	metaCurrencyKeepExcessFabula: 'metaCurrencyKeepExcessFabula',
	// Combat HUD
	experimentalCombatHud: 'experimentalCombatHud',
	optionCombatHudActorOrdering: 'optionCombatHudActorOrdering',
	optionCombatHudCompact: 'optionCombatHudCompact',
	optionCombatHudDraggedPosition: 'optionCombatHudDraggedPosition',
	optionCombatHudEffectsMarqueeDuration: 'optionCombatHudEffectsMarqueeDuration',
	optionCombatHudEffectsMarqueeMode: 'optionCombatHudEffectsMarqueeMode',
	optionCombatHudMinimized: 'optionCombatHudMinimized',
	optionCombatHudOpacity: 'optionCombatHudOpacity',
	optionCombatHudPortrait: 'optionCombatHudPortrait',
	optionCombatHudPositionButton: 'optionCombatHudPositionButton',
	optionCombatHudPosition: 'optionCombatHudPosition',
	optionCombatHudReordering: 'optionCombatHudReordering',
	optionCombatHudSaved: 'optionCombatHudSaved',
	optionCombatHudShowEffects: 'optionCombatHudShowEffects',
	optionCombatHudShowNPCTurnsLeftMode: 'optionCombatHudShowNPCTurnsLeftMode',
	optionCombatHudShowOrderNumbers: 'optionCombatHudShowOrderNumbers',
	optionCombatHudTheme: 'optionCombatHudTheme',
	optionCombatHudTurnIconsActive: 'optionCombatHudTurnIconsActive',
	optionCombatHudTurnIconsOutOfTurns: 'optionCombatHudTurnIconsOutOfTurns',
	optionCombatHudTurnIconsTurnsLeftHidden: 'optionCombatHudTurnIconsTurnsLeftHidden',
	optionCombatHudTrackedResource1: 'optionCombatHudTrackedResource1',
	optionCombatHudTrackedResource2: 'optionCombatHudTrackedResource2',
	optionCombatHudTrackedResource3: 'optionCombatHudTrackedResource3',
	optionCombatHudTrackedResource4: 'optionCombatHudTrackedResource4',
	optionCombatHudWidth: 'optionCombatHudWidth',
	// Chat Message
	optionChatMessageOptions: 'optionChatMessageOptions',
	optionChatMessageHideTags: 'optionChatMessageHideTags',
	optionChatMessageHideDescription: 'optionChatMessageHideDescription',
	optionChatMessageCollapseDescription: 'optionChatMessageCollapseDescription',
	optionChatMessageHideQuality: 'optionChatMessageHideQuality',
	optionChatMessageHideRollDetails: 'optionChatMessageHideRollDetails',
	optionCombatMouseDown: 'optionCombatMouseDown',
	optionDefaultTargetingMode: 'optionDefaultTargetingMode',
	// Behavior Rolls
	optionBehaviorRoll: 'optionBehaviorRoll',
	optionTargetPriority: 'optionTargetPriority',
	optionTargetPriorityRules: 'optionTargetPriorityRules',
	optionStudySavePath: 'optionStudySavePath',
	// Optional Rules
	optionCampingRules: 'optionCampingRules',
	optionQuirks: 'optionQuirks',
	optionZeroPower: 'optionZeroPower',
	useRevisedStudyRule: 'useRevisedStudyRule',
	// Sheets
	sheetOptions: 'sheetOptions',
	showAssociatedTherioforms: 'showAssociatedTherioforms',
	optionNPCNotesTab: 'optionNPCNotesTab',
	optionAlwaysFavorite: 'optionAlwaysFavorite',
	// Automation
	automationOptions: 'automationOptions',
	optionAutomationManageEffects: 'optionAutomationManageEffects',
	optionAutomationRemoveExpiredEffects: 'optionAutomationRemoveExpiredEffects',
	optionAutomationEffectsReminder: 'optionAutomationEffectsReminder',
	// Homebrew
	homebrewOptions: 'homebrewOptions',
	optionBondMaxLength: 'optionBondMaxLength',
	optionRenameCurrency: 'optionRenameCurrency',
	opportunities: 'opportunities',
	affinityResistance: 'affinityResistance',
	affinityVulnerability: 'affinityVulnerability',
	// Party
	activeParty: 'optionActiveParty',
	// STATE
	activeWellsprings: 'activeWellsprings',
});

/**
 * @description Uses {@link https://foundryvtt.com/api/classes/client.ClientSettings.html#registerMenu}
 * @returns {Promise<void>}
 */
export const registerSystemSettings = async function () {
	// CHAT MESSAGE OPTIONS
	game.settings.registerMenu(SYSTEM, 'myChatMessageOptions', {
		name: game.i18n.localize('FU.ChatMessageOptions'),
		label: game.i18n.localize('FU.ChatMessageOptionsManage'),
		hint: game.i18n.localize('FU.ChatMessageOptionsSettingsInstuction'),
		icon: 'fas fa-message',
		type: createConfigurationApp('FU.ChatMessageOptions', [
			SETTINGS.optionChatMessageHideTags,
			SETTINGS.optionChatMessageHideDescription,
			SETTINGS.optionChatMessageCollapseDescription,
			SETTINGS.optionChatMessageHideQuality,
			SETTINGS.optionChatMessageHideRollDetails,
		]),
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionChatMessageHideTags, {
		name: game.i18n.localize('FU.ChatMessageHideTags'),
		hint: game.i18n.localize('FU.ChatMessageHideTagsHint'),
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionChatMessageHideDescription, {
		name: game.i18n.localize('FU.ChatMessageHideDescription'),
		hint: game.i18n.localize('FU.ChatMessageHideDescriptionHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionChatMessageCollapseDescription, {
		name: game.i18n.localize('FU.ChatMessageCollapseDescription'),
		hint: game.i18n.localize('FU.ChatMessageCollapseDescriptionHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionChatMessageHideQuality, {
		name: game.i18n.localize('FU.ChatMessageHideQuality'),
		hint: game.i18n.localize('FU.ChatMessageHideQualityHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionChatMessageHideRollDetails, {
		name: game.i18n.localize('FU.ChatMessageHideRollDetails'),
		hint: game.i18n.localize('FU.ChatMessageHideRollDetailsHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	// OPTIONAL RULES
	game.settings.registerMenu(SYSTEM, 'myOptionalRules', {
		name: game.i18n.localize('FU.OptionalRules'),
		label: game.i18n.localize('FU.OptionalRulesManage'),
		hint: game.i18n.localize('FU.OptionalRulesSettingsInstuction'),
		icon: 'fas fa-book',
		type: createConfigurationApp('FU.OptionalRules', [SETTINGS.optionQuirks, SETTINGS.optionZeroPower, SETTINGS.optionCampingRules, SETTINGS.useRevisedStudyRule]),
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionQuirks, {
		name: game.i18n.localize('FU.QuirksSettings'),
		hint: game.i18n.localize('FU.QuirksSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionZeroPower, {
		name: game.i18n.localize('FU.ZeroPowerSettings'),
		hint: game.i18n.localize('FU.ZeroPowerSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCampingRules, {
		name: game.i18n.localize('FU.CampingActivitiesSettings'),
		hint: game.i18n.localize('FU.CampingActivitiesSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.useRevisedStudyRule, {
		name: game.i18n.localize('FU.RevisedStudyRollSettings'),
		hint: game.i18n.localize('FU.RevisedStudyRollSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	// BEHAVIOR ROLLS
	game.settings.register(SYSTEM, SETTINGS.optionBehaviorRoll, {
		name: game.i18n.localize('FU.BehaviorRollsSettings'),
		hint: game.i18n.localize('FU.BehaviorRollsSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.registerMenu(SYSTEM, 'myBehaviorRolls', {
		name: game.i18n.localize('FU.BehaviorRolls'),
		label: game.i18n.localize('FU.BehaviorRollsManage'),
		hint: game.i18n.localize('FU.BehaviorRollsManageHint'),
		icon: 'fas fa-book',
		type: createConfigurationApp('FU.BehaviorRolls', [SETTINGS.optionBehaviorRoll, SETTINGS.optionTargetPriority, SETTINGS.optionTargetPriorityRules]),
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

	game.settings.register(SYSTEM, SETTINGS.optionTargetPriorityRules, {
		name: game.i18n.localize('FU.TotalPartyMemberRulesSettings'),
		hint: game.i18n.localize('FU.TotalPartyMemberRulesSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	// Party
	game.settings.register(SYSTEM, SETTINGS.activeParty, {
		name: 'FU.ActiveParty',
		hint: 'FU.ActivePartyHint',
		icon: 'fa-solid fa-users',
		config: true,
		scope: 'world',
		type: new foundry.data.fields.ForeignDocumentField(Actor, {
			nullable: true,
			blank: true,
			idOnly: true,
		}),
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatMouseDown, {
		name: game.i18n.localize('FU.CombatHudPanTokenSettings'),
		hint: game.i18n.localize('FU.CombatHudPanTokenSettingsHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionDefaultTargetingMode, {
		name: game.i18n.localize('FU.DefaultTargetingMode'),
		hint: game.i18n.localize('FU.DefaultTargetingModeHint'),
		scope: 'client',
		config: true,
		type: String,
		default: 'prioritizeSelected',
		choices: {
			prioritizeSelected: game.i18n.localize('FU.DefaultTargetingModePrioritizeSelected'),
			prioritizeTargeted: game.i18n.localize('FU.DefaultTargetingModePrioritizeTargeted'),
			tokenSelected: game.i18n.localize('FU.DefaultTargetingModeTokenSelected'),
			tokenTargeted: game.i18n.localize('FU.DefaultTargetingModeTokenTargeted'),
		},
	});

	game.settings.register(SYSTEM, SETTINGS.optionStudySavePath, {
		name: game.i18n.localize('FU.StudySavePathSettings'),
		hint: game.i18n.localize('FU.StudySavePathSettingsHint'),
		scope: 'world',
		config: true,
		type: String,
		default: 'Bestiary',
	});

	game.settings.registerMenu(SYSTEM, 'combatHudSettings', {
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

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudPositionButton, {
		name: game.i18n.localize('FU.CombatHudPositionButton'),
		hint: game.i18n.localize('FU.CombatHudPositionButtonHint'),
		scope: 'client',
		config: false,
		type: String,
		default: 'top',
		choices: {
			top: game.i18n.localize('FU.CombatHudPositionButtonTop'),
			bottom: game.i18n.localize('FU.CombatHudPositionButtonBottom'),
		},
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
			bottom: game.i18n.localize('FU.CombatHudPositionBottom'),
			top: game.i18n.localize('FU.CombatHudPositionTop'),
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
			actor: game.i18n.localize('FU.CombatHudPortraitActor'),
			token: game.i18n.localize('FU.CombatHudPortraitToken'),
		},
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudCompact, {
		name: 'CombatHudCompact',
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudMinimized, {
		name: 'CombatHudMinimized',
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudSaved, {
		name: 'CombatHudSaved',
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
			normal: game.i18n.localize('FU.CombatHudEffectsMarqueeModeNormal'),
			alternate: game.i18n.localize('FU.CombatHudEffectsMarqueeModeAlternate'),
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
		onChange: () => {
			CombatHUD.update();
		},
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudDraggedPosition, {
		name: game.i18n.localize('FU.CombatHudDraggedPosition'),
		hint: game.i18n.localize('FU.CombatHudDraggedPositionHint'),
		scope: 'client',
		config: false,
		type: Object,
		default: {},
	});

	game.settings.register(SYSTEM, SETTINGS.metaCurrencyFabula, {
		name: 'Count used Fabula Points',
		scope: 'world',
		config: false,
		type: Number,
		range: {
			min: 0,
			step: 1,
		},
		default: 0,
		onChange: () => Hooks.callAll(MetaCurrencyTrackerApplication.HOOK_UPDATE_META_CURRENCY),
	});

	game.settings.register(SYSTEM, SETTINGS.metaCurrencyUltima, {
		name: 'Count used Ultima Points',
		scope: 'world',
		config: false,
		type: Number,
		range: {
			min: 0,
			step: 1,
		},
		default: 0,
		onChange: () => Hooks.callAll(MetaCurrencyTrackerApplication.HOOK_UPDATE_META_CURRENCY),
	});

	game.settings.registerMenu(SYSTEM, 'metaCurrencySettings', {
		name: game.i18n.localize('FU.ConfigMetaCurrencySettings'),
		hint: game.i18n.localize('FU.ConfigMetaCurrencySettingsHint'),
		label: game.i18n.localize('FU.ConfigMetaCurrencySettingsLabel'),
		icon: 'fas fa-chart-line',
		type: createConfigurationApp('FU.ConfigMetaCurrencySettings', [SETTINGS.metaCurrencyBaseExperience, SETTINGS.metaCurrencyKeepExcessFabula, SETTINGS.metaCurrencyAutomation, SETTINGS.metaCurrencyAutomaticallyDistributeExp]),
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.metaCurrencyAutomation, {
		name: game.i18n.localize('FU.ConfigMetaCurrencyAutomation'),
		hint: game.i18n.localize('FU.ConfigMetaCurrencyAutomationHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.metaCurrencyBaseExperience, {
		name: game.i18n.localize('FU.ConfigMetaCurrencyBaseExperience'),
		hint: game.i18n.localize('FU.ConfigMetaCurrencyBaseExperienceHint'),
		scope: 'world',
		config: false,
		type: Number,
		range: {
			min: 0,
			step: 1,
		},
		default: 5,
	});

	game.settings.register(SYSTEM, SETTINGS.metaCurrencyKeepExcessFabula, {
		name: game.i18n.localize('FU.ConfigMetaCurrencyKeepExcessFabula'),
		hint: game.i18n.localize('FU.ConfigMetaCurrencyKeepExcessFabulaHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.metaCurrencyAutomaticallyDistributeExp, {
		name: game.i18n.localize('FU.ConfigMetaCurrencyAutomaticallyDistributeExp'),
		hint: game.i18n.localize('FU.ConfigMetaCurrencyAutomaticallyDistributeExpHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTrackedResource1, {
		name: game.i18n.localize('FU.CombatHudTrackedResource1'),
		hint: game.i18n.localize('FU.CombatHudTrackedResource1Hint'),
		scope: 'world',
		config: false,
		type: String,
		choices: FU.combatHudResources,
		default: 'hp',
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTrackedResource2, {
		name: game.i18n.localize('FU.CombatHudTrackedResource2'),
		hint: game.i18n.localize('FU.CombatHudTrackedResource2Hint'),
		scope: 'world',
		config: false,
		type: String,
		choices: FU.combatHudResources,
		default: 'mp',
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTrackedResource3, {
		name: game.i18n.localize('FU.CombatHudTrackedResource3'),
		hint: game.i18n.localize('FU.CombatHudTrackedResource3Hint'),
		scope: 'world',
		config: false,
		type: String,
		choices: FU.combatHudResources,
		default: 'ip',
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTheme, {
		name: game.i18n.localize('FU.CombatHudTheme'),
		hint: game.i18n.localize('FU.CombatHudThemeHint'),
		scope: 'world',
		config: false,
		type: String,
		default: 'fu-default',
		choices: FU.combatHudThemes,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTrackedResource4, {
		name: game.i18n.localize('FU.CombatHudTrackedResource4'),
		hint: game.i18n.localize('FU.CombatHudTrackedResource4Hint'),
		scope: 'world',
		config: false,
		type: String,
		choices: FU.combatHudResources,
		default: 'none',
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTurnIconsActive, {
		name: game.i18n.localize('FU.CombatHudTurnIconsActive'),
		hint: game.i18n.localize('FU.CombatHudTurnIconsActiveHint'),
		scope: 'world',
		config: false,
		type: String,
		default: 'play_circle',
		onChange: () => {
			ui.combat.render(true);
			CombatHUD.update();
		},
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTurnIconsOutOfTurns, {
		name: game.i18n.localize('FU.CombatHudTurnIconsOutOfTurns'),
		hint: game.i18n.localize('FU.CombatHudTurnIconsOutOfTurnsHint'),
		scope: 'world',
		config: false,
		type: String,
		default: 'check_circle',
		onChange: () => {
			if (game.combat?.isActive) {
				ui.combat.render(true);
				CombatHUD.update();
			}
		},
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudTurnIconsTurnsLeftHidden, {
		name: game.i18n.localize('FU.CombatHudTurnIconsTurnsLeftHidden'),
		hint: game.i18n.localize('FU.CombatHudTurnIconsTurnsLeftHiddenHint'),
		scope: 'world',
		config: false,
		type: String,
		default: 'help',
		onChange: () => {
			if (game.combat?.isActive) {
				ui.combat.render(true);
				CombatHUD.update();
			}
		},
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudShowNPCTurnsLeftMode, {
		name: game.i18n.localize('FU.CombatHudShowNPCTurnsLeftMode'),
		hint: game.i18n.localize('FU.CombatHudShowNPCTurnsLeftModeHint'),
		scope: 'world',
		config: false,
		type: String,
		default: 'only-studied',
		choices: {
			never: game.i18n.localize('FU.CombatHudShowNPCTurnsLeftModeNever'),
			always: game.i18n.localize('FU.CombatHudShowNPCTurnsLeftModeAlways'),
			'only-studied': game.i18n.localize('FU.CombatHudShowNPCTurnsLeftModeOnlyStudied'),
		},
	});

	game.settings.register(SYSTEM, SETTINGS.activeWellsprings, {
		name: game.i18n.localize('FU.ClassFeatureInvocationsWellspring'),
		scope: 'world',
		config: false,
		requiresReload: false,
		type: WellspringDataModel,
		onChange: (newValue) =>
			Hooks.callAll(FUHooks.HOOK_WELLSPRING_CHANGED, [
				{
					scope: 'world',
					wellsprings: newValue,
				},
			]),
	});

	// SHEETS
	game.settings.registerMenu(SYSTEM, SETTINGS.sheetOptions, {
		name: game.i18n.localize('FU.SheetOptionsTitle'),
		label: game.i18n.localize('FU.SheetOptions'),
		hint: game.i18n.localize('FU.SheetOptionsHint'),
		icon: 'fas fa-book',
		type: createConfigurationApp('FU.SheetOptions', [SETTINGS.optionNPCNotesTab, SETTINGS.optionAlwaysFavorite, SETTINGS.showAssociatedTherioforms]),
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionNPCNotesTab, {
		name: game.i18n.localize('FU.NotesTabSettings'),
		hint: game.i18n.localize('FU.NotesTabSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.showAssociatedTherioforms, {
		name: game.i18n.localize('FU.ClassFeatureTherioformOptionShowAssociatedTherioformsName'),
		hint: game.i18n.localize('FU.ClassFeatureTherioformOptionShowAssociatedTherioformsHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionAlwaysFavorite, {
		name: game.i18n.localize('FU.AlwaysFavoriteSettings'),
		hint: game.i18n.localize('FU.AlwaysFavoriteSettingsHint'),
		scope: 'client',
		config: false,
		type: Boolean,
		default: false,
	});

	// AUTOMATION
	game.settings.registerMenu(SYSTEM, SETTINGS.automationOptions, {
		name: game.i18n.localize('FU.Automation'),
		label: game.i18n.localize('FU.AutomationOptions'),
		hint: game.i18n.localize('FU.AutomationHint'),
		icon: 'fa fa-wrench',
		type: createConfigurationApp('FU.AutomationOptions', [SETTINGS.optionAutomationManageEffects, SETTINGS.optionAutomationEffectsReminder, SETTINGS.optionAutomationRemoveExpiredEffects]),
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionAutomationManageEffects, {
		name: game.i18n.localize('FU.AutomationManageEffects'),
		hint: game.i18n.localize('FU.AutomationManageEffectsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionAutomationEffectsReminder, {
		name: game.i18n.localize('FU.AutomationEffectsReminder'),
		hint: game.i18n.localize('FU.AutomationEffectsReminderHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionAutomationRemoveExpiredEffects, {
		name: game.i18n.localize('FU.AutomationRemoveExpiredEffects'),
		hint: game.i18n.localize('FU.AutomationRemoveExpiredEffectsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	// HOMEBREW
	game.settings.registerMenu(SYSTEM, SETTINGS.homebrewOptions, {
		name: game.i18n.localize('FU.Homebrew'),
		label: game.i18n.localize('FU.HomebrewOptions'),
		hint: game.i18n.localize('FU.HomebrewHint'),
		icon: 'fa fa-coffee',
		type: createConfigurationApp('FU.HomebrewOptions', [SETTINGS.optionRenameCurrency, SETTINGS.optionBondMaxLength, SETTINGS.affinityResistance, SETTINGS.affinityVulnerability]),
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionRenameCurrency, {
		name: game.i18n.localize('FU.RenameCurrency'),
		hint: game.i18n.localize('FU.RenameCurrencyHint'),
		scope: 'world',
		config: false,
		type: String,
		default: 'Zenit',
	});

	game.settings.register(SYSTEM, SETTINGS.optionBondMaxLength, {
		name: game.i18n.localize('FU.BondMax'),
		hint: game.i18n.localize('FU.BondMaxHint'),
		scope: 'world',
		config: false,
		type: Number,
		default: 6,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.affinityResistance, {
		name: game.i18n.localize('FU.AffinityResistance'),
		hint: game.i18n.localize('FU.AffinityResistanceHint'),
		scope: 'world',
		config: false,
		type: Number,
		default: 0.5,
		range: {
			min: 0.5,
			step: 0.05,
			max: 1,
		},
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.affinityVulnerability, {
		name: game.i18n.localize('FU.AffinityVulnerable'),
		hint: game.i18n.localize('FU.AffinityVulnerableHint'),
		scope: 'world',
		config: false,
		type: Number,
		default: 2,
		range: {
			min: 1,
			step: 0.05,
			max: 2,
		},
		requiresReload: true,
	});
};

class CombatHudSettings extends FUApplication {
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

/**
 * @param {string} name
 * @param {string[]} settings
 * @return {typeof SettingsConfigurationApp}
 * @remarks Expects the settings to be various settings to be already registered, but hidden.
 */
function createConfigurationApp(name, settings) {
	return class ConfigApp extends SettingsConfigurationApp {
		static DEFAULT_OPTIONS = {
			window: { title: name },
		};

		constructor() {
			super(settings);
		}
	};
}

class SettingsConfigurationApp extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		classes: ['settings-config-app'],
		form: {
			handler: SettingsConfigurationApp.#save,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/app/settings/settings-config-app.hbs',
		},
	};

	#settingData = [];

	/**
	 * @param {string[]} settings
	 */
	constructor(settings) {
		super();

		const isGM = game.user.isGM;
		const fields = foundry.data.fields;
		for (let settingKey of settings || []) {
			const settingDocument = game.settings.get(SYSTEM, settingKey, { document: true });
			const setting = game.settings.settings.get(settingDocument.key);

			if (setting.scope === CONST.SETTING_SCOPES.WORLD && !isGM) {
				continue;
			}

			const data = {
				namespace: setting.namespace,
				key: setting.key,
				completeKey: settingDocument.key,
				value: game.settings.get(setting.namespace, setting.key),
			};
			if (setting.type instanceof fields.DataField) {
				data.field = setting.type;
			} else if (setting.type === Boolean) {
				data.field = new fields.BooleanField({ initial: setting.default ?? false });
			} else if (setting.type === Number) {
				const { min, max, step } = setting.range ?? {};
				data.field = new fields.NumberField({
					required: true,
					choices: setting.choices,
					initial: setting.default,
					min,
					max,
					step,
				});
			} else if (setting.filePicker) {
				throw new Error('SettingsConfigurationApp does not support file pickers');
			} else {
				data.field = new fields.StringField({ required: true, choices: setting.choices });
			}
			data.field.name = settingDocument.key;
			data.field.label ||= game.i18n.localize(setting.name ?? '');
			data.field.hint ||= game.i18n.localize(setting.hint ?? '');

			this.#settingData.push(data);
		}
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		Object.assign(context, {
			settings: this.#settingData,
		});
		console.log(context.settings);
		return context;
	}

	static async #save(event, form, formData) {
		let requiresClientReload = false;
		let requiresWorldReload = false;

		for (const setting of this.#settingData) {
			const priorValue = game.settings.get(setting.namespace, setting.key, { document: true })._source.value;
			let newValue;
			try {
				const formValue = formData.object[setting.completeKey];
				newValue = await game.settings.set(setting.namespace, setting.key, formValue, { document: true });
			} catch (error) {
				ui.notifications.error(error);
			}
			if (priorValue === newValue) continue; // Compare JSON strings
			requiresClientReload ||= setting.scope !== CONST.SETTING_SCOPES.WORLD && setting.requiresReload;
			requiresWorldReload ||= setting.scope === CONST.SETTING_SCOPES.WORLD && setting.requiresReload;
		}
		if (requiresClientReload || requiresWorldReload) {
			await foundry.applications.settings.SettingsConfig.reloadConfirm({ world: requiresWorldReload });
		}
	}
}
