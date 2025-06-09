/**
 * @description Base data model for items in the system
 */
export class FUItemDataModel extends foundry.abstract.TypeDataModel {
	/**
	 * @returns {FUPartialTemplate[]}
	 */
	get attributePartials() {
		return [];
	}
}
