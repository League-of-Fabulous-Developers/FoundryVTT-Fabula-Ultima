import { FU, SYSTEM } from './helpers/config.mjs';
import { MetaCurrencyTrackerApplication } from './ui/metacurrency/MetaCurrencyTrackerApplication.mjs';
import { CombatHUD } from './ui/combat-hud.mjs';
import { FUHooks } from './hooks.mjs';
import { WellspringDataModel } from './documents/items/classFeature/invoker/invoker-integration.mjs';
import { CombatHudSettings } from './settings/combatHudSettings.js';
import { SettingsConfigurationApp } from './settings/settings-configuration-app.js';
import { PartyDataModel } from './documents/actors/party/party-data-model.mjs';

/**
 * @description All system settings
 */
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
	const fields = foundry.data.fields;

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
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionZeroPower, {
		name: game.i18n.localize('FU.ZeroPowerSettings'),
		hint: game.i18n.localize('FU.ZeroPowerSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCampingRules, {
		name: game.i18n.localize('FU.CampingActivitiesSettings'),
		hint: game.i18n.localize('FU.CampingActivitiesSettingsHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: true,
		requiresReload: true,
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
		type: new fields.ForeignDocumentField(Actor, {
			nullable: true,
			blank: true,
			idOnly: true,
			choices: () => Object.fromEntries(game.actors.contents.filter((actor) => actor.system instanceof PartyDataModel).map((a) => [a.id, a.name])),
		}),
		restricted: true,
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

	game.settings.register(SYSTEM, SETTINGS.optionCombatMouseDown, {
		name: game.i18n.localize('FU.CombatHudPanTokenSettings'),
		hint: game.i18n.localize('FU.CombatHudPanTokenSettingsHint'),
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	// COMBAT HUD
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
		type: createConfigurationApp('FU.HomebrewOptions', [SETTINGS.optionRenameCurrency, SETTINGS.optionBondMaxLength, SETTINGS.affinityResistance, SETTINGS.affinityVulnerability, SETTINGS.opportunities]),
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
		name: 'FU.AffinityVulnerable',
		hint: 'FU.AffinityVulnerableHint',
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

	// OPPORTUNITIES
	// game.settings.registerMenu(SYSTEM, 'opportunitySettings', {
	// 	name: game.i18n.localize('FU.ExperimentalCombatHudSettings'),
	// 	hint: game.i18n.localize('FU.ExperimentalCombatHudSettingsHint'),
	// 	label: game.i18n.localize('FU.ExperimentalCombatHudSettingsLabel'),
	// 	scope: 'client',
	// 	icon: 'fas fa-book',
	// 	type: CombatHudSettings,
	// });

	game.settings.register(SYSTEM, SETTINGS.opportunities, {
		name: 'FU.Opportunities',
		hint: 'FU.OpportunitiesHint',
		scope: 'world',
		config: false,
		type: new fields.ForeignDocumentField(RollTable, {
			nullable: true,
			blank: true,
			idOnly: true,
		}),
	});
};

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
