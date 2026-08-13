import FoundryUtils from '../../helpers/foundry-utils.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { RuleActionRegistry } from './actions/rule-action-data-model.mjs';
import { RuleTriggerRegistry } from './triggers/rule-trigger-data-model.mjs';
import { RulePredicateRegistry } from './predicates/rule-predicate-data-model.mjs';
import { FU } from '../../helpers/config.mjs';
import { StringUtils } from '../../helpers/string-utils.mjs';
import { EmptyRuleTrigger } from './triggers/empty-rule-trigger.mjs';

/**
 * @description A modular automation component for use in active effects
 * @property {RuleTriggerDataModel} trigger
 * @property {RuleActionDataModel[]} actions
 * @property {RulePredicateDataModel[]} predicates
 * @property {FUTargetSelectorKey} selector
 * @property {Boolean} enabled
 */
export class RuleElementDataModel extends foundry.abstract.DataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
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
		const { TypedSchemaField, TypedObjectField, StringField, BooleanField } = foundry.data.fields;
		return {
			trigger: new TypedSchemaField(RuleTriggerRegistry.instance.qualifiedTypes, {
				initial: new EmptyRuleTrigger(),
			}),
			actions: new TypedObjectField(new TypedSchemaField(RuleActionRegistry.instance.qualifiedTypes)),
			predicates: new TypedObjectField(new TypedSchemaField(RulePredicateRegistry.instance.qualifiedTypes)),
			selector: new StringField({ initial: 'initial', choices: Object.keys(FU.targetSelector) }),
			enabled: new BooleanField({ initial: true }),
		};
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
		let subTypes = this.getMatchingSubTypes(RuleActionRegistry.instance);
		const options = FoundryUtils.generateConfigOptions(subTypes);
		const type = await FoundryUtils.selectOptionDialog(
			StringUtils.localize('FU.AddElement', {
				element: StringUtils.localize('FU.RuleActions'),
			}),
			options,
		);
		if (type) {
			throw new Error('fixme');
			// await SubDocumentCollectionField.addModel(this.actions, type, this);
		}
	}

	/**
	 * @param {String} id The id of the action
	 * @returns {Promise<void>}
	 */
	async removeRuleAction(id) {
		const action = this.getAction(id);
		if (action) {
			await action.delete();
		}
	}

	/**
	 * @param {String} id
	 * @returns {RuleActionDataModel}
	 */
	getAction(id) {
		return this.actions.get(id);
	}

	/**
	 * @param {String} id
	 * @returns {RulePredicateDataModel}
	 */
	getPredicate(id) {
		return this.predicates.get(id);
	}

	/**
	 * @returns {Promise<void>}
	 */
	async addRulePredicate() {
		let subTypes = this.getMatchingSubTypes(RulePredicateRegistry.instance);
		const options = FoundryUtils.generateConfigOptions(subTypes);
		const type = await FoundryUtils.selectOptionDialog(
			StringUtils.localize('FU.AddElement', {
				element: StringUtils.localize('FU.RulePredicates'),
			}),
			options,
		);
		if (type) {
			throw new Error('fixme');
			// await SubDocumentCollectionField.addModel(this.predicates, type, this);
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
	 * @param {DataModelRegistry} registry
	 * @returns {Record<string, string>}
	 */
	getMatchingSubTypes(registry) {
		let subTypes = registry.localizedEntries;
		const triggerEventType = this.trigger.schema.model.metadata.eventType;
		if (triggerEventType) {
			subTypes = Object.fromEntries(
				Object.entries(subTypes).filter(([key, value]) => {
					const model = registry.types[key];
					/** @type RuleActionMetaData **/
					const modelMetaData = model.metadata;
					if (modelMetaData.eventTypes) {
						if (modelMetaData.eventTypes.find((t) => t === triggerEventType) === undefined) {
							return false;
						}
					}
					return true;
				}),
			);
		}
		return subTypes;
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
	async prepareRenderContext(context) {
		for (const action of this.actions) {
			await action.prepareRenderContext(context);
		}
	}

	/**
	 * @returns {String}
	 * @remarks Used by handlebars templates.
	 */
	get templateHeader() {
		return StringUtils.localize(this.trigger.schema.model.localization);
	}

	static migrateData(source) {
		if (source.trigger) {
			const trigger = source.trigger;
			if (trigger.type && trigger.type.indexOf('.') < 0) {
				trigger.type = RuleTriggerRegistry.instance.qualify(trigger.type);
			}
		}
		if (source.predicates) {
			for (let [, predicate] of Object.entries(source.predicates)) {
				if (predicate.type && predicate.type.indexOf('.') < 0) {
					predicate.type = RulePredicateRegistry.instance.qualify(predicate.type);
				}
			}
		}
		if (source.actions) {
			for (let [, action] of Object.entries(source.actions)) {
				if (action.type && action.type.indexOf('.') < 0) {
					action.type = RuleActionRegistry.instance.qualify(action.type);
				}
			}
		}
		return source;
	}
}
