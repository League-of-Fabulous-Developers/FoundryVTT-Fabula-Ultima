export const registerSystemSettings = async function () {
	game.settings.registerMenu('fabulaultima', 'myOptionalRules', {
		name: 'Optional Rules',
		label: 'Manage Optional Rules',
		hint: 'Decide what optional rules you would like to include in your world.',
		icon: 'fas fa-book',
		type: OptionalRules,
		restricted: true,
	});

	await game.settings.register('fabulaultima', 'optionQuirks', {
		name: 'Enable Quirks?',
		hint: 'Play with the Quirk advanced optional rule from Atlas High Fantasy pg 114.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});
	await game.settings.register('fabulaultima', 'optionZeroPower', {
		name: 'Enable Zero Powers?',
		hint: 'Play with the Zero Power optional rule from Atlas High Fantasy pg 124.',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});
	await game.settings.register('fabulaultima', 'optionCampingRules', {
		name: 'Enable Camping Activities?',
		hint: 'Play with the Camping Activities optional rule from Natural Fantasy Playtest',
		scope: 'world',
		config: false,
		type: Boolean,
		default: false,
	});
};

class OptionalRules extends FormApplication {
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			template: 'systems/fabulaultima/templates/system/settings/optional-rules.hbs',
		});
	}
	getData() {
		return {
			optionQuirks: game.settings.get('fabulaultima', 'optionQuirks'),
			optionZeroPower: game.settings.get('fabulaultima', 'optionZeroPower'),
			optionCampingRules: game.settings.get('fabulaultima', 'optionCampingRules'),
		};
	}

	_updateObject(event, formData) {
		const data = expandObject(formData);
		game.settings.set('fabulaultima', 'optionQuirks', optionQuirks);
		game.settings.set('fabulaultima', 'optionZeroPower', optionZeroPower);
		game.settings.set('fabulaultima', 'optionCampingRules', optionCampingRules);
	}
}
