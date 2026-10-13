import { FU } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { PseudoDocument } from '../pseudo/pseudo-document.mjs';
import { RuleElements } from '../../pipelines/rule-elements.mjs';
import { RuleActionRegistry } from './actions/rule-action-data-model.mjs';
import { RuleTriggerRegistry } from './triggers/rule-trigger-data-model.mjs';
import { RulePredicateRegistry } from './predicates/rule-predicate-data-model.mjs';
import { ConsumableTraits, Traits, TraitUtils } from '../../pipelines/traits.mjs';
import FoundryUtils from '../../helpers/foundry-utils.mjs';
import { StringUtils } from '../../helpers/string-utils.mjs';

RuleElements.register();

/**
 * The Application responsible for configuring a single ActiveEffect document within a parent Actor or Item.
 */
export class FUActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
	#expandedRuleElements = {};
	#pendingConfirmations = new Set();
	#workingDocument;

	constructor(...args) {
		super(...args);
		this.#workingDocument = this.document.clone({}, { keepId: true });
	}

	/** @inheritdoc */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', `backgroundstyle`, 'active-effect-sheet'],
		actions: {
			addChange: this.#addChange,
			deleteChange: this.#deleteChange,
			addRuleElement: this.#addRuleElement,
			deleteRuleElement: this.#deleteRuleElement,
			clearRuleElements: this.#clearRuleElements,
			addRuleAction: this.#addRuleAction,
			removeRuleAction: this.#removeRuleAction,
			addRulePredicate: this.#addRulePredicate,
			removeRulePredicate: this.#removeRulePredicate,
		},
		form: {
			closeOnSubmit: false,
		},
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
			templates: Object.values(RuleActionRegistry.instance.qualifiedTypes)
				.map((pt) => {
					return pt.template;
				})
				.concat(
					Object.values(RuleTriggerRegistry.instance.qualifiedTypes).map((pt) => {
						return pt.template;
					}),
				)
				.concat(
					Object.values(RulePredicateRegistry.instance.qualifiedTypes).map((pt) => {
						return pt.template;
					}),
				),
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
				{ id: 'rules', label: 'FU.Rule', icon: 'fa-solid fa-list', cssClass: 'scrollable' },
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

			case 'rules':
				{
					context.options = {
						...FU,
						ruleActions: RuleActionRegistry.instance.localizedEntries,
						ruleTriggers: RuleTriggerRegistry.instance.localizedEntries,
						damageTypeOptions: FoundryUtils.getFormOptions(FU.damageTypes),
						itemGroupOptions: FoundryUtils.getFormOptions(FU.itemGroup),
						speciesOptions: FoundryUtils.getFormOptions(FU.species),
						checkTypeOptions: FoundryUtils.getFormOptions(FU.checkTypes),
						rankOptions: FoundryUtils.getFormOptions(FU.rank),
						weaponCategoryOptions: FoundryUtils.getFormOptions(FU.weaponCategories),
						consumableTraitOptions: FoundryUtils.getFormOptions(ConsumableTraits, (k) => k),
						traits: TraitUtils.getOptions(Traits),
					};
				}
				break;
		}
		return partContext;
	}

	/**
	 * @returns {FUActiveEffectModel}
	 */
	get system() {
		return this.#workingDocument.system;
	}

	/** @inheritdoc */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.document = this.#workingDocument;
		context.model = this.#workingDocument;
		context.source = this.#workingDocument._source;
		context.fields = this.#workingDocument.schema.fields;
		context.systemFields = this.system.schema.fields;
		context.effect = this.#workingDocument;
		context.system = this.system;
		context.effectType = FU.effectType;
		context.trackStyles = FU.trackStyles;
		context.crisisInteractions = FU.crisisInteractions;
		let parent = this.#workingDocument.parent;
		while (parent != null) {
			if (parent.type === 'character' || parent.type === 'npc') {
				context.actor = parent;
			} else if (parent.type === 'item') {
				context.item = parent;
			}
			parent = parent.parent;
		}
		for (const re of Object.values(this.system.rules.elements)) {
			await re.prepareRenderContext(context);
		}

		context.expandedRuleElements = this.#expandedRuleElements;

		context.originName = this.#workingDocument.sourceName;

		context.documents ??= {};
		context.documents.macro = game.macros.contents;

		return context;
	}

	/** @inheritdoc */
	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		// Wire up all rule trigger selectors
		this.element.addEventListener('change', (evt) => {
			const target = evt.target.closest("[data-action='updateRuleTrigger']");
			if (!target) return;
			this.#updateRuleTrigger(evt, target);
		});
	}

	/** @inheritDoc */
	async _onRender(context, options) {
		await super._onRender(context, options);
		const html = this.element;

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

		// Add toggle handler to track expanded/contracted state for RE summaries
		const reElements = this.element.querySelectorAll(`.pfu-foldout[data-rule-element]:not([data-rule-element=""])`); // Selector should grab only items with a *non-empty* data-rule-element
		for (const elem of reElements) {
			if (elem instanceof HTMLDetailsElement) {
				elem.addEventListener('toggle', () => {
					this.#expandedRuleElements[elem.dataset.ruleElement] = elem.open;
				});
			}
		}
	}

	/**
	 * Add a standard Active Effect change to the working copy.
	 */
	static #addChange() {
		this.#syncFormToWorkingDocument();
		const changes = foundry.utils.deepClone(this.#workingDocument._source.system.changes ?? []);
		changes.push(this.system.schema.fields.changes.element.getInitialValue());
		return this.#updateWorkingDocument({
			system: {
				changes: foundry.data.operators.ForcedReplacement.create(changes),
			},
		});
	}

	/**
	 * Delete a standard Active Effect change from the working copy.
	 * @param {PointerEvent} event The originating click event
	 */
	static #deleteChange(event) {
		this.#syncFormToWorkingDocument();
		const changes = foundry.utils.deepClone(this.#workingDocument._source.system.changes ?? []);
		const index = Number(event.target.closest('li').dataset.index) || 0;
		changes.splice(index, 1);
		return this.#updateWorkingDocument({
			system: {
				changes: foundry.data.operators.ForcedReplacement.create(changes),
			},
		});
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addRuleElement(event, target) {
		const triggerTypes = RuleTriggerRegistry.instance.localizedEntries;
		const options = FoundryUtils.generateConfigOptions(triggerTypes);
		const type = await FoundryUtils.selectOptionDialog(
			StringUtils.localize('FU.AddElement', {
				element: StringUtils.localize('FU.RuleElement'),
			}),
			options,
		);
		if (type) {
			return this.#updateWorkingDocument({
				system: {
					rules: {
						elements: {
							[foundry.utils.randomID()]: {
								trigger: {
									type: type,
								},
							},
						},
					},
				},
			});
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #deleteRuleElement(event, target) {
		const id = target.closest('[data-rule-element]')?.dataset.ruleElement;
		console.debug(`Deleting rule element ${id}`);
		/** @type RuleElementDataModel **/
		const re = this.system.getRuleElement(id);
		if (re) {
			const confirm = await this.#confirmRemoval(`element:${id}`, _loc(re.trigger.constructor.localization));
			if (confirm) {
				return this.#updateWorkingDocument({
					system: {
						rules: {
							elements: {
								[id]: foundry.data.operators.ForcedDeletion.create(),
							},
						},
					},
				});
			}
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #clearRuleElements(event, target) {
		const confirm = await FoundryUtils.confirmDialog('FU.Clear', `FU.DialogClearMessage`);
		if (confirm) {
			return this.#updateWorkingDocument({
				system: {
					rules: {
						elements: foundry.data.operators.ForcedReplacement.create({}),
					},
				},
			});
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	async #updateRuleTrigger(event, target) {
		const id = target.closest('[data-rule-element]')?.dataset.ruleElement;
		const type = target.value;
		console.debug(`Updating rule trigger of ${id} to: ${type} (${event.type})`);
		const re = this.system.getRuleElement(id);
		if (re) {
			return this.#updateWorkingDocument({
				system: {
					rules: {
						elements: {
							[id]: {
								trigger: foundry.data.operators.ForcedReplacement.create({ type: type }),
							},
						},
					},
				},
			});
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addRuleAction(event, target) {
		const id = target.closest('[data-rule-element]')?.dataset.ruleElement;
		console.debug(`Adding rule action to ${id}`);
		const re = this.system.getRuleElement(id);
		if (re) {
			const subTypes = re.getMatchingSubTypes(RuleActionRegistry.instance);
			const options = FoundryUtils.generateConfigOptions(subTypes);
			const type = await FoundryUtils.selectOptionDialog(
				StringUtils.localize('FU.AddElement', {
					element: StringUtils.localize('FU.RuleActions'),
				}),
				options,
			);
			if (type) {
				return this.#updateWorkingDocument({
					system: {
						rules: {
							elements: {
								[id]: {
									actions: {
										[foundry.utils.randomID()]: { type: type },
									},
								},
							},
						},
					},
				});
			}
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #removeRuleAction(event, target) {
		const actionId = target.dataset.actionId;
		const id = target.closest('[data-rule-element]')?.dataset.ruleElement;
		const re = this.system.getRuleElement(id);
		const action = re?.getAction(actionId);
		if (action) {
			console.debug(`Removing rule action ${actionId} from ${id}`);
			const confirm = await this.#confirmRemoval(`action:${id}:${actionId}`, _loc(action.constructor.localization));
			if (confirm) {
				return this.#updateWorkingDocument({
					system: {
						rules: {
							elements: {
								[id]: {
									actions: {
										[actionId]: foundry.data.operators.ForcedDeletion.create(),
									},
								},
							},
						},
					},
				});
			}
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addRulePredicate(event, target) {
		const id = target.closest('[data-rule-element]')?.dataset.ruleElement;
		console.debug(`Adding rule predicate to ${id}`);
		const re = this.system.getRuleElement(id);
		if (re) {
			const subTypes = re.getMatchingSubTypes(RulePredicateRegistry.instance);
			const options = FoundryUtils.generateConfigOptions(subTypes);
			const type = await FoundryUtils.selectOptionDialog(
				StringUtils.localize('FU.AddElement', {
					element: StringUtils.localize('FU.RulePredicates'),
				}),
				options,
			);
			if (type) {
				return this.#updateWorkingDocument({
					system: {
						rules: {
							elements: {
								[id]: {
									predicates: {
										[foundry.utils.randomID()]: { type: type },
									},
								},
							},
						},
					},
				});
			}
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #removeRulePredicate(event, target) {
		const predicateId = target.dataset.predicateId;
		const id = target.closest('[data-rule-element]')?.dataset.ruleElement;
		console.debug(`Removing rule predicate ${predicateId} from ${id}`);
		const re = this.system.getRuleElement(id);
		const predicate = re?.getPredicate(predicateId);
		if (predicate) {
			const confirm = await this.#confirmRemoval(`predicate:${id}:${predicateId}`, _loc(predicate.constructor.localization));
			if (confirm) {
				return this.#updateWorkingDocument({
					system: {
						rules: {
							elements: {
								[id]: {
									predicates: {
										[predicateId]: foundry.data.operators.ForcedDeletion.create(),
									},
								},
							},
						},
					},
				});
			}
		}
	}

	/** @inheritdoc */
	_onClose(options) {
		// Reset all cached sheet state
		this.#expandedRuleElements = {};
		this.#workingDocument = this.document.clone({}, { keepId: true });
		return super._onClose(options);
	}

	/** @inheritdoc */
	_processFormData(event, form, formData) {
		const submitData = super._processFormData(event, form, formData);

		const submittedChanges = submitData.system?.changes ?? {};
		const changes = foundry.utils.deepClone(this.#workingDocument._source.system.changes ?? []);
		for (const [index, change] of Object.entries(submittedChanges)) {
			changes[index] ??= {};
			foundry.utils.mergeObject(changes[index], change, { applyOperators: true, inplace: true });
		}

		const submittedElements = submitData.system?.rules?.elements ?? {};
		const elements = foundry.utils.deepClone(this.#workingDocument._source.system.rules.elements);
		foundry.utils.mergeObject(elements, submittedElements, { applyOperators: true, inplace: true });

		submitData.system ??= {};
		submitData.system.changes = foundry.data.operators.ForcedReplacement.create(changes);
		submitData.system.rules ??= {};
		submitData.system.rules.elements = foundry.data.operators.ForcedReplacement.create(elements);
		return submitData;
	}

	_onChangeForm(formConfig, event) {
		super._onChangeForm(formConfig, event);
		this.#syncFormToWorkingDocument();

		if (event.target instanceof HTMLInputElement && event.target.name === 'transfer') {
			this.submit({ updateData: { transfer: event.target.checked } });
		}
	}

	async #confirmRemoval(key, label) {
		if (this.#pendingConfirmations.has(key)) return false;
		this.#pendingConfirmations.add(key);
		try {
			return await FoundryUtils.confirmDialog('FU.Remove', _loc('FU.DialogRemoveMessage', { label }));
		} finally {
			this.#pendingConfirmations.delete(key);
		}
	}

	#syncFormToWorkingDocument() {
		if (!this.form) return;
		const formData = new foundry.applications.ux.FormDataExtended(this.form);
		const submitData = this._processFormData(null, this.form, formData);
		this.#workingDocument.updateSource(submitData);
	}

	#updateWorkingDocument(changes) {
		this.#syncFormToWorkingDocument();
		this.#workingDocument.updateSource(changes);
		return this.render();
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
			}
			// Stats
			// for (const stat of ['def', 'mdef', 'init']) {
			// 	attributeKeys.push(`system.derived.${stat}.value`);
			// }
			// Affinities
			for (const aff of Object.keys(FU.damageTypes)) {
				attributeKeys.push(`system.affinities.${aff}`);
			}
		}
	}

	attributeKeys = attributeKeys.sort((a, b) => a.localeCompare(b));
	return attributeKeys;
}
