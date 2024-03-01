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
