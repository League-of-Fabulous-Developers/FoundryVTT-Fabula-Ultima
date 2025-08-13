import { FU } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';

/**
 * The Application responsible for configuring a single ActiveEffect document within a parent Actor or Item.
 */
export class FUActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
	/** @inheritdoc */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', `backgroundstyle`],
	};

	/** @inheritdoc */
	static PARTS = {
		header: {
			template: 'templates/sheets/active-effect/header.hbs',
		},
		tabs: {
			template: 'templates/generic/tab-navigation.hbs',
		},

		// DEFAULT
		details: {
			template: 'templates/sheets/active-effect/details.hbs',
		},
		changes: {
			template: 'templates/sheets/active-effect/changes.hbs',
		},
		// ADDITIONS/CHANGES
		duration: {
			template: systemTemplatePath('effects/active-effect-duration'),
		},
		predicates: {
			template: systemTemplatePath('effects/active-effect-predicates'),
		},
		rules: {
			template: systemTemplatePath('effects/active-effect-rules'),
		},

		footer: {
			template: 'templates/generic/form-footer.hbs',
		},
	};

	/** @override */
	static TABS = {
		sheet: {
			tabs: [
				{ id: 'details', icon: 'fa-solid fa-book' },
				{ id: 'duration', icon: 'fa-solid fa-clock' },
				{ id: 'predicates', label: 'FU.Predicate', icon: 'fa-solid fa-check' },
				{ id: 'rules', label: 'FU.Rule', icon: 'fa-solid fa-list' },
				{ id: 'changes', icon: 'fa-solid fa-gears' },
			],
			initial: 'details',
			labelPrefix: 'EFFECT.TABS',
		},
	};

	/** @inheritDoc */
	async _preparePartContext(partId, context) {
		const partContext = await super._preparePartContext(partId, context);
		switch (partId) {
			case 'duration':
				{
					context.effectDuration = FU.effectDuration;
					context.effectTracking = FU.effectTracking;
				}
				break;

			case 'predicates':
				{
					context.crisisInteractions = FU.crisisInteractions;
				}
				break;
		}
		return partContext;
	}

	/** @inheritdoc */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.systemFields = this.document.system.schema.fields;
		context.system = this.document.system;
		context.effectType = FU.effectType;
		context.crisisInteractions = FU.crisisInteractions;
		return context;
	}

	/** @inheritDoc */
	async _onRender(context, options) {
		await super._onRender(context, options);
		const html = this.element;

		// CHANGES Tab
		if (!html.querySelector('#effect-key-options')) {
			const options = getAttributeKeys();
			const datalist = document.createElement('datalist');
			datalist.id = 'effect-key-options';

			options.forEach((opt) => {
				const option = document.createElement('option');
				option.value = opt;
				datalist.appendChild(option);
			});

			html.appendChild(datalist);
		}

		html.querySelectorAll('.key input').forEach((el) => {
			const name = el.getAttribute('name');
			const value = el.value;

			const newInput = document.createElement('input');
			newInput.type = 'text';
			newInput.name = name;
			newInput.value = value;
			newInput.setAttribute('list', 'effect-key-options');

			el.parentNode.replaceChild(newInput, el);
		});

		// Remove assigning statuses since we don't do that
		const statusForm = html.querySelector('div.form-group.statuses');
		statusForm.remove();
	}
}

let attributeKeys = undefined;

/**
 * @returns {String[]}
 */
function getAttributeKeys() {
	if (!attributeKeys) {
		attributeKeys = [];
		const characterFields = CONFIG.Actor.dataModels.character.schema.fields;
		if (characterFields) {
			attributeKeys = attributeKeys.concat(flattenSchemaFields(characterFields, 'system'));
			// TODO: Derived Keys
			// Resources
			for (const res of ['hp', 'mp', 'ip']) {
				attributeKeys.push(`system.resources.${res}.max`);
			}
			// Attributes
			for (const attr of Object.keys(FU.attributes)) {
				attributeKeys.push(`system.attributes.${attr}.current`);
			}
			// Stats
			// for (const stat of ['def', 'mdef', 'init']) {
			// 	attributeKeys.push(`system.derived.${stat}.value`);
			// }
			// Affinities
			for (const aff of Object.keys(FU.damageTypes)) {
				attributeKeys.push(`system.affinities.${aff}.current`);
			}
		}
		attributeKeys = attributeKeys.sort((a, b) => b.localeCompare(a));
	}
	return attributeKeys;
}

function flattenSchemaFields(obj, prefix = '', result = []) {
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value.fields) {
			flattenSchemaFields(value.fields, path, result);
		} else {
			result.push(path);
		}
	}
	return result;
}
