import { FU } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { PseudoDocument } from '../pseudo/pseudo-document.mjs';
import { TypedCollectionField } from '../sub/typed-collection-field.mjs';
import { RuleElements } from '../../pipelines/rule-elements.mjs';
import { RuleElementDataModel } from './rule-element-data-model.mjs';
import { RuleActionRegistry } from './actions/rule-action-data-model.mjs';
import { RuleTriggerRegistry } from './triggers/rule-trigger-data-model.mjs';
import { RulePredicateRegistry } from './predicates/rule-predicate-data-model.mjs';
import { TraitUtils } from '../../pipelines/traits.mjs';
import FoundryUtils from '../../helpers/foundry-utils.mjs';

RuleElements.register();

/**
 * The Application responsible for configuring a single ActiveEffect document within a parent Actor or Item.
 */
export class FUActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
	/** @inheritdoc */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', `backgroundstyle`, 'active-effect-sheet'],
		actions: {
			addRuleElement: this.#addRuleElement,
			deleteRuleElement: this.#deleteRuleElement,
			clearRuleElements: this.#clearRuleElements,
			addRuleAction: this.#addRuleAction,
			removeRuleAction: this.#removeRuleAction,
			addRulePredicate: this.#addRulePredicate,
			removeRulePredicate: this.#removeRulePredicate,
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
				)
				.concat([RuleElementDataModel.template]),
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

			case 'rules':
				{
					context.options = {
						ruleActions: RuleActionRegistry.instance.localizedEntries,
						ruleTriggers: RuleTriggerRegistry.instance.localizedEntries,
						combatEvent: FU.combatEvent,
						duration: FU.duration,
						damageTypes: FU.damageTypes,
						damageTypeOptions: FoundryUtils.getFormOptions(FU.damageTypes),
						damageSource: FU.damageSource,
						damageSourceOptions: FoundryUtils.getFormOptions(FU.damageSource),
						expenseSource: FU.expenseSource,
						checkTypes: FU.checkTypes,
						checkTypeOptions: FoundryUtils.getFormOptions(FU.checkTypes),
						attributes: FU.attributes,
						resources: FU.resourcesCombat,
						species: FU.species,
						weaponTypes: FU.weaponTypes,
						handedness: FU.handedness,
						weaponCategories: FU.weaponCategories,
						weaponCategoryOptions: FoundryUtils.getFormOptions(FU.weaponCategories),
						targetingRules: FU.targetingRules,
						commandAction: FU.commandAction,
						statusEffects: FU.statusEffects,
						eventRelation: FU.eventRelation,
						factionRelation: FU.factionRelation,
						bondPredicate: FU.bondPredicate,
						targetSelector: FU.targetSelector,
						checkResult: FU.checkResult,
						checkOutcome: FU.checkOutcome,
						traits: TraitUtils.getOptions(),
						changeSetMode: FU.changeSetMode,
						booleanOption: FU.booleanOption,
						collectionChange: FU.collectionChange,
						collectionRemovalRule: FU.collectionRemovalRule,
						scalarChange: FU.scalarChange,
						comparisonOperator: FU.comparisonOperator,
						targetingPredicate: FU.targetingPredicate,
						predicateQuantifier: FU.predicateQuantifier,
					};
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
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addRuleElement(event, target) {
		const type = RuleElementDataModel.TYPE;
		await TypedCollectionField.addModel(this.document.system.rules.elements, type, this.document);
		console.debug(`Added rule element`);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #deleteRuleElement(event, target) {
		const { id } = target.dataset;
		console.debug(`Deleting rule element ${id}`);
		const ruleElement = this.document.system.rules.elements.get(id);
		if (ruleElement) {
			await ruleElement.delete();
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #clearRuleElements(event, target) {
		const { type } = target.dataset;
		await TypedCollectionField.addModel(this.document.system.rules.elements, type, this.document);
		console.debug(this.document.system.rules.elements);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	async #updateRuleTrigger(event, target) {
		const { id } = target.dataset;
		const type = target.value;
		console.debug(`Updating rule trigger of ${id} to: ${type} (${event.type})`);
		const re = this.document.system.getRuleElement(id);
		await re.changeRuleTrigger(type);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addRuleAction(event, target) {
		const { id } = target.dataset;
		console.debug(`Adding rule action to ${id}`);
		const re = this.document.system.getRuleElement(id);
		await re.addRuleAction();
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #removeRuleAction(event, target) {
		const { id, actionId } = target.dataset;
		console.debug(`Removing rule action ${actionId} from ${id}`);
		const re = this.document.system.getRuleElement(id);
		await re.removeRuleAction(actionId);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addRulePredicate(event, target) {
		const { id } = target.dataset;
		console.debug(`Adding rule predicate to ${id}`);
		const re = this.document.system.getRuleElement(id);
		await re.addRulePredicate();
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #removeRulePredicate(event, target) {
		const { id, predicateId } = target.dataset;
		console.debug(`Removing rule predicate ${predicateId} from ${id}`);
		const re = this.document.system.getRuleElement(id);
		await re.removeRulePredicate(predicateId);
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
