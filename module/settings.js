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
});

export const registerSystemSettings = async function () {
	game.settings.registerMenu(SYSTEM, 'myOptionalRules', {
		name: 'Optional Rules',
		label: 'Manage Optional Rules',
		hint: 'Decide what optional rules you would like to include in your world.',
		icon: 'fas fa-book',
		type: OptionalRules,
		restricted: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionQuirks, {
		name: 'Enable Quirks?',
		hint: 'Play with the Quirk advanced optional rule from Atlas High Fantasy pg 114.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionZeroPower, {
		name: 'Enable Zero Powers?',
		hint: 'Play with the Zero Power optional rule from Atlas High Fantasy pg 124.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCampingRules, {
		name: 'Enable Camping Activities?',
		hint: 'Play with the Camping Activities optional rule from Natural Fantasy Playtest.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionBehaviorRoll, {
		name: 'Enable Behavior Roll?',
		hint: 'Play with the Random Targeting rule from Core Rulebook pg 297.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.registerMenu(SYSTEM, 'myBehaviorRolls', {
		name: 'Behavior Rolls',
		label: 'Manage Behavior Rolls',
		hint: ' Manage the Behavior Roll mechanic based on Random Targeting.',
		icon: 'fas fa-book',
		type: myBehaviorRolls,
		restricted: true,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionTargetPriority, {
		name: 'Total Party Members?',
		hint: 'How many heroes are currently in your party for target priority.',
		scope: 'world',
		config: false,
		type: Number,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.collapseDescriptions, {
		name: 'Collapse Item Descriptions',
		hint: 'Chat descriptions on weapons, items, spells and abilities will be collapsed by default',
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
		name: 'Disable Pan to Token for Combat Tracker',
		hint: 'Enable this option to prevent panning to the token when clicking on a combatant in the Combat Tracker.',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.useRevisedStudyRule, {
		name: 'Revised Study Roll',
		hint: 'Enable this option to use revised Study Roll [7/10/13] from Rework Playtest.',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionImagePixelated, {
		name: 'Pixelated View',
		hint: 'Enable this option to render 16-bit art in a viewable manner, preserving its retro aesthetic with minimal scaling artifacts.',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionAlwaysFavorite, {
		name: 'Always Favorite Item',
		hint: 'Enable this option to always favorite an item during creation.',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionNPCNotesTab, {
		name: 'Enable NPC Notes Tab',
		hint: 'Add the biography & info notes tab into the NPC Sheet.',
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
		scope: 'world',
		icon: 'fas fa-book',
		restricted: true,
		type: CombatHudSettings,
	});

	game.settings.register(SYSTEM, SETTINGS.experimentalCombatHud, {
		name: game.i18n.localize('FU.ExperimentalCombatHud'),
		hint: game.i18n.localize('FU.ExperimentalCombatHudHint'),
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudOpacity, {
		name: game.i18n.localize('FU.CombatHudOpacity'),
		hint: game.i18n.localize('FU.CombatHudOpacityHint'),
		scope: 'local',
		config: false,
		type: Number,
		default: 100,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudWidth, {
		name: game.i18n.localize('FU.CombatHudWidth'),
		hint: game.i18n.localize('FU.CombatHudWidthHint'),
		scope: 'local',
		config: false,
		type: Number,
		default: 100,
		requiresReload: true,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudPosition, {
		name: game.i18n.localize('FU.CombatHudPosition'),
		hint: game.i18n.localize('FU.CombatHudPositionHint'),
		scope: 'local',
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
		scope: 'world',
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
		scope: 'local',
		config: false,
		type: Boolean,
		default: false,
	});

	game.settings.register(SYSTEM, SETTINGS.optionCombatHudMinimized, {
		name: "CombatHudMinimized",
		scope: 'local',
		config: false,
		type: Boolean,
		default: false,
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
		}
	}

	async _updateObject(event, formData) {
		const { experimentalCombatHud, optionCombatHudOpacity, optionCombatHudWidth, optionCombatHudPosition, optionCombatHudPortrait } = expandObject(formData);
		game.settings.set(SYSTEM, SETTINGS.experimentalCombatHud, experimentalCombatHud);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudOpacity, optionCombatHudOpacity);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudWidth, optionCombatHudWidth);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudPosition, optionCombatHudPosition);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudPortrait, optionCombatHudPortrait);

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

		await SettingsConfig.reloadConfirm({ world: true });
	}
}