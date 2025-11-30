import { SubDocumentDataModel } from '../sub/sub-document-data-model.mjs';
import { CombatEventRuleTrigger } from './triggers/combat-event-rule-trigger.mjs';
import FoundryUtils from '../../helpers/foundry-utils.mjs';
import { TypedCollectionField } from '../sub/typed-collection-field.mjs';
import { DataModelRegistry } from '../../fields/data-model-registry.mjs';
import { systemId, systemTemplatePath } from '../../helpers/system-utils.mjs';
import { RuleActionDataModel, RuleActionRegistry } from './actions/rule-action-data-model.mjs';
import { RuleTriggerRegistry } from './triggers/rule-trigger-data-model.mjs';
import { RulePredicateDataModel, RulePredicateRegistry } from './predicates/rule-predicate-data-model.mjs';
import { FU } from '../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @description A modular automation component for use in active effects
 * @property {RuleTriggerDataModel} trigger
 * @property {TypedCollectionField, RuleActionDataModel[]} actions
 * @property {RulePredicateDataModel[]} predicates
 * @property {FUTargetSelectorKey} selector
 * @property {Boolean} enabled
 */
export class RuleElementDataModel extends SubDocumentDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'ruleElement' });
	}

	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			documentName: 'ruleElement',
			icon: 'fa-solid fa-circle-nodes',
			embedded: {
				ruleTrigger: 'trigger',
				ruleAction: 'actions',
				rulePredicate: 'predicates',
			},
		};
	}

	static get template() {
		return systemTemplatePath('effects/rule-element');
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			trigger: new fields.TypedSchemaField(RuleTriggerRegistry.instance.types, {
				initial: new CombatEventRuleTrigger(),
				nullable: true,
			}),
			actions: new TypedCollectionField(RuleActionDataModel),
			predicates: new TypedCollectionField(RulePredicateDataModel),
			selector: new fields.StringField({ initial: 'initial', choices: Object.keys(FU.targetSelector) }),
			enabled: new fields.BooleanField({ initial: true }),
		});
	}

	static migrateData(source) {
		if (source.trigger.selector) {
			source.selector = source.trigger.selector;
			delete source.trigger.selector;
		}
		return super.migrateData(source);
	}

	/**
	 * @param {String} type
	 */
	async changeRuleTrigger(type) {
		if (type === this.trigger.type) {
			return;
		}
		const model = RuleTriggerRegistry.instance.types[type];
		const newTrigger = new model();
		await this.update({ '==trigger': newTrigger });
	}

	/**
	 * @returns {Promise<void>}
	 */
	async addRuleAction() {
		let subTypes = RuleActionRegistry.instance.localizedEntries;
		const triggerEventType = this.trigger.schema.model.metadata.eventType;
		if (triggerEventType) {
			subTypes = Object.fromEntries(
				Object.entries(subTypes).filter(([key, value]) => {
					const model = RuleActionRegistry.instance.types[key];
					if (model.metadata.eventType) {
						if (triggerEventType !== model.metadata.eventType) {
							return false;
						}
					}
					return true;
				}),
			);
		}
		const options = FoundryUtils.generateConfigOptions(subTypes);
		const type = await FoundryUtils.selectOptionDialog('FU.AddRuleElement', options);
		if (type) {
			await TypedCollectionField.addModel(this.actions, type, this);
		}
	}

	/**
	 * @param {String} id The id of the action
	 * @returns {Promise<void>}
	 */
	async removeRuleAction(id) {
		const action = this.actions.get(id);
		if (action) {
			await action.delete();
		}
	}

	/**
	 * @returns {Promise<void>}
	 */
	async addRulePredicate() {
		const subTypes = RulePredicateRegistry.instance.localizedEntries;
		const options = FoundryUtils.generateConfigOptions(subTypes);
		const type = await FoundryUtils.selectOptionDialog('FU.Add', options);
		if (type) {
			await TypedCollectionField.addModel(this.predicates, type, this);
		}
	}

	/**
	 * @param {String} id The id of the action
	 * @returns {Promise<void>}
	 */
	async removeRulePredicate(id) {
		const predicate = this.predicates.get(id);
		if (predicate) {
			await predicate.delete();
		}
	}

	/**
	 * @param {RuleElementContext} context
	 * @returns {Boolean} True if the element was executed.
	 */
	async evaluate(context) {
		// 0. Enabled
		if (!this.enabled) {
			return false;
		}
		// 1. Evaluate the attached trigger
		const valid = this.trigger.evaluate(context);
		if (!valid) {
			return false;
		}
		// 2. Optional filtering based on variable predicates
		for (const predicate of this.predicates) {
			if (!predicate.validateContext(context)) {
				return false;
			}
		}
		// 3. Select what characters to execute the actions on
		const selected = context.selectTargets(this.selector);
		// 4. Execute the actions on all selected characters
		for (const action of this.actions) {
			await action.execute(context, selected);
		}
		return true;
	}

	/**
	 * @description Adds to a rendering context
	 * @param {Object} context
	 * @returns {Promise<void>}
	 */
	async prepareContext(context) {
		for (const action of this.actions) {
			await action.renderContext(context);
		}
	}
}

/**
 * @description Registry of all {@linkcode RuleElementDataModel}
 */
export class RuleElementRegistry extends DataModelRegistry {
	constructor() {
		super({
			kind: 'Rule Element',
			baseClass: RuleElementDataModel,
		});
		this.register(systemId, RuleElementDataModel.TYPE, RuleElementDataModel);
	}

	static instance = new RuleElementRegistry();
}
