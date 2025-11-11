import { FU } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { PseudoDocument } from '../pseudo/pseudo-document.mjs';

/**
 * The Application responsible for configuring a single ActiveEffect document within a parent Actor or Item.
 */
export class FUActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
	/** @inheritdoc */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', `backgroundstyle`, 'active-effect-sheet'],
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
			// template: 'templates/sheets/active-effect/details.hbs',
			template: systemTemplatePath('effects/active-effect-details'),
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

	static _migrateConstructorParams(first, rest) {
		if (first?.document instanceof PseudoDocument) {
			return first;
		}
		return super._migrateConstructorParams(first, rest);
	}

	static #dummyActor;

	static get dummyActor() {
		if (!this.#dummyActor) {
			this.#dummyActor = new foundry.documents.Actor.implementation({ type: 'character', name: 'Temp Actor' });
		}
		return this.#dummyActor;
	}

	get dummyActor() {
		return this.constructor.dummyActor;
	}

	get isEditable() {
		if ('editable' in this.options) {
			return this.options.editable;
		}
		return super.isEditable;
	}

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
		context.trackStyles = FU.trackStyles;
		context.crisisInteractions = FU.crisisInteractions;
		return context;
	}

	/** @inheritDoc */
	async _onRender(context, options) {
		await super._onRender(context, options);
		const html = this.element;

		// TODO: Add other fields in
		// DETAILS TAB
		// const details = html.querySelector('section[data-tab="details"]');
		// if (details) {
		// }

		// CHANGES Tab
		const effectKeyOptions = html.querySelector('#effect-key-options');
		const targetDocument = this.document.target ?? this.dummyActor;

		if (this.#effectKeysRequireUpdate(effectKeyOptions, targetDocument)) {
			effectKeyOptions?.remove();
			const attributeKeys = getAttributeKeys(targetDocument);
			const datalist = document.createElement('datalist');
			datalist.id = 'effect-key-options';
			datalist.dataset.documentName = targetDocument.documentName;
			datalist.dataset.documentType = targetDocument.type;

			attributeKeys.forEach((opt) => {
				const option = document.createElement('option');
				option.value = opt;
				datalist.appendChild(option);
			});

			html.appendChild(datalist);
		}

		html.querySelectorAll('.key input').forEach((el) => {
			el.setAttribute('list', 'effect-key-options');
		});

		// Remove assigning statuses since we don't do that
		const statusForm = html.querySelector('div.form-group.statuses');
		statusForm.remove();
	}

	_onChangeForm(formConfig, event) {
		super._onChangeForm(formConfig, event);

		if (event.target instanceof HTMLInputElement && event.target.name === 'transfer') {
			this.submit({ updateData: { transfer: event.target.checked } });
		}
	}

	#effectKeysRequireUpdate(effectKeyOptions, targetDocument) {
		if (!effectKeyOptions) {
			return true;
		}

		const targetDocumentName = targetDocument.documentName;
		const targetDocumentType = targetDocument.type;

		const { documentName, documentType } = effectKeyOptions.dataset;

		return documentName !== targetDocumentName || documentType !== targetDocumentType;
	}
}

/**
 * @returns {String[]}
 */
function getAttributeKeys(document) {
	let attributeKeys = [];

	if (document.system) {
		document.system.schema.apply(function () {
			if (this.constructor.recursive) return;
			attributeKeys.push(this.fieldPath);
		});
	}

	if (document.documentName === 'Actor') {
		if (document.isCharacterType) {
			// TODO: Derived Keys
			// Resources
			const resources = ['hp', 'mp'];
			if (document.type === 'character') resources.push('ip');
			for (const res of resources) {
				attributeKeys.push(`system.resources.${res}.max`);
			}
			attributeKeys.push('system.resources.hp.crisisScore');
			// Attributes
			for (const attr of Object.keys(FU.attributes)) {
				attributeKeys.push(`system.attributes.${attr}`);
				attributeKeys.push(`system.attributes.${attr}.current`);
			}
			// Stats
			// for (const stat of ['def', 'mdef', 'init']) {
			// 	attributeKeys.push(`system.derived.${stat}.value`);
			// }
			// Affinities
			for (const aff of Object.keys(FU.damageTypes)) {
				attributeKeys.push(`system.affinities.${aff}`);
				attributeKeys.push(`system.affinities.${aff}.current`);
			}
		}
	}

	attributeKeys = attributeKeys.sort((a, b) => a.localeCompare(b));
	return attributeKeys;
}
