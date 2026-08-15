import { DataModelRegistry } from '../../../fields/data-model-registry.mjs';

/**
 * @description Executes an action given context information and selected targets.
 * @static metadata
 */
export class RuleActionDataModel extends foundry.abstract.DataModel {
	static get metadata() {
		return {
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

	async prepareRenderContext(context) {}
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
