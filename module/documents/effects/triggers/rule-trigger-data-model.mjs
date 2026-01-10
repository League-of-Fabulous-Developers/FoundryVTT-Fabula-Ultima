import { SubDocumentDataModel } from '../../sub/sub-document-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { DataModelRegistry } from '../../../fields/data-model-registry.mjs';

const fields = foundry.data.fields;

/**
 * @description Defines the trigger for a rule element.
 * @property {FUTargetSelectorKey} selector
 * @property {FUEventRelationKey} eventRelation
 * @property {RulePredicateDataModel[] | TypedCollectionField} predicates
 */
export class RuleTriggerDataModel extends SubDocumentDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			documentName: 'ruleTrigger',
			icon: 'fa-solid fa-check',
			eventType: '',
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			eventRelation: new fields.StringField({
				initial: '',
				blank: true,
				choices: Object.keys(FU.eventRelation),
			}),
		});
	}

	// TODO: Remove once design is done
	static migrateData(source) {
		if (source.eventRelation === 'none') {
			source.eventRelation = '';
		}
		// if (source.type === 'resourceExpendRuleTrigger') {
		//
		// }
		return super.migrateData(source);
	}

	/**
	 * @return {String}
	 */
	static get localization() {
		throw new Error('Not implemented');
	}

	/**
	 * @return {String}
	 */
	static get template() {
		throw new Error('Not implemented');
	}

	/**
	 * @param {RuleElementContext} context
	 * @returns {Boolean}
	 */
	validateContext(context) {
		return false;
	}

	/**
	 * @param {RuleElementContext} context
	 * @returns {boolean}
	 */
	preValidateContext(context) {
		switch (this.eventRelation) {
			case 'source':
				if (context.source?.actor !== context.character?.actor) {
					return false;
				}
				break;

			case 'target':
				if (context.targets.find((t) => t.actor === context.character.actor) === undefined) {
					return false;
				}
				break;
		}
		if (this.constructor.metadata.eventType !== context.type) {
			return false;
		}
		return true;
	}

	/**
	 * @param {RuleElementContext} context
	 * @returns {Boolean}
	 */
	evaluate(context) {
		if (!this.preValidateContext(context)) {
			return false;
		}
		return this.validateContext(context);
	}
}

/**
 * @description Registry of all {@linkcode RuleTriggerDataModel}
 */
export class RuleTriggerRegistry extends DataModelRegistry {
	constructor() {
		super({
			kind: 'Rule Trigger',
			baseClass: RuleTriggerDataModel,
		});
	}

	static instance = new RuleTriggerRegistry();
}
