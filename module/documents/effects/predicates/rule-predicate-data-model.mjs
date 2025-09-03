import { DataModelRegistry } from '../../../fields/data-model-registry.mjs';
import { SubDocumentDataModel } from '../../sub/sub-document-data-model.mjs';

// const fields = foundry.data.fields;

/**
 * @description Defines the trigger for a rule element.
 */
export class RulePredicateDataModel extends SubDocumentDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			documentName: 'rulePredicate',
			icon: 'fa-solid fa-check',
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {});
	}

	static migrateData(source) {
		if (source.type === 'targetRelationRulePredicate') {
			source.type = 'factionRelationRulePredicate';
		}
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
		throw new Error('Not implemented');
	}
}

/**
 * @description Registry of all {@linkcode RuleElementDataModel}
 */
export class RulePredicateRegistry extends DataModelRegistry {
	constructor() {
		super({
			kind: 'Rule Predicate',
			baseClass: RulePredicateDataModel,
		});
	}

	static instance = new RulePredicateRegistry();
}
