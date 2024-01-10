export const registerSystemSettings = async function () {
	game.settings.registerMenu('projectfu', 'myOptionalRules', {
		name: 'Optional Rules',
		label: 'Manage Optional Rules',
		hint: 'Decide what optional rules you would like to include in your world.',
		icon: 'fas fa-book',
		type: OptionalRules,
		restricted: true,
	});

	await game.settings.register('projectfu', 'optionQuirks', {
		name: 'Enable Quirks?',
		hint: 'Play with the Quirk advanced optional rule from Atlas High Fantasy pg 114.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});
	await game.settings.register('projectfu', 'optionZeroPower', {
		name: 'Enable Zero Powers?',
		hint: 'Play with the Zero Power optional rule from Atlas High Fantasy pg 124.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});
	await game.settings.register('projectfu', 'optionCampingRules', {
		name: 'Enable Camping Activities?',
		hint: 'Play with the Camping Activities optional rule from Natural Fantasy Playtest',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});
  game.settings.register('projectfu', 'collapseDescriptions', {
    name: 'Collapse Item Descriptions',
    hint: 'Chat descriptions on weapons, items, spells and abilities will be collapsed by default',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });
};

class OptionalRules extends FormApplication {
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			template: 'systems/projectfu/templates/system/settings/optional-rules.hbs',
		});
	}
	getData() {
		return {
			optionQuirks: game.settings.get('projectfu', 'optionQuirks'),
			optionZeroPower: game.settings.get('projectfu', 'optionZeroPower'),
			optionCampingRules: game.settings.get('projectfu', 'optionCampingRules'),
		};
	}

	_updateObject(event, formData) {
		const data = expandObject(formData);
		game.settings.set('projectfu', 'optionQuirks', optionQuirks);
		game.settings.set('projectfu', 'optionZeroPower', optionZeroPower);
		game.settings.set('projectfu', 'optionCampingRules', optionCampingRules);
	}
}
