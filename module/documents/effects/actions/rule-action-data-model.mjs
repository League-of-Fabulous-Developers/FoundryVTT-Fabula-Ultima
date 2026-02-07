import { SubDocumentDataModel } from '../../sub/sub-document-data-model.mjs';
import { DataModelRegistry } from '../../../fields/data-model-registry.mjs';

/**
 * @typedef RuleActionMetaData
 * @extends SubDocumentMetadata
 * @property {string[]} eventTypes
 */

/**
 * @description Executes an action given context information and selected targets.
 * @static metadata
 */
export class RuleActionDataModel extends SubDocumentDataModel {
	/**
	 * @inheritdoc
	 * @returns RuleActionMetaData
	 * */
	static get metadata() {
		return {
			...super.metadata,
			documentName: 'ruleAction',
			icon: 'fa-wrench',
		};
	}

	// TODO: Remove once design is done
	static migrateData(source) {
		if (source.type === 'resourceUpdateRuleAction') {
			source.type = 'updateResourceRuleAction';
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
	 * @param {CharacterInfo[]} selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		throw new Error('Not implemented');
	}
}

/**
 * @description Registry of all {@linkcode RuleActionDataModel}
 */
export class RuleActionRegistry extends DataModelRegistry {
	constructor() {
		super({
			kind: 'Rule Action',
			baseClass: RuleActionDataModel,
		});
	}

	static instance = new RuleActionRegistry();
}
