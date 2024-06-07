import { AttributeDataModel } from './attribute-data-model.mjs';
import { statusEffects } from '../../../helpers/statuses.mjs';

/**
 * @property {AttributeDataModel} dex
 * @property {AttributeDataModel} ins
 * @property {AttributeDataModel} mig
 * @property {AttributeDataModel} wlp
 */
export class AttributesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { EmbeddedDataField } = foundry.data.fields;
		return {
			dex: new EmbeddedDataField(AttributeDataModel, {}),
			ins: new EmbeddedDataField(AttributeDataModel, {}),
			mig: new EmbeddedDataField(AttributeDataModel, {}),
			wlp: new EmbeddedDataField(AttributeDataModel, {}),
		};
	}

	handleStatusEffects() {
		const actor = this.parent.actor;
		actor.statuses.forEach((status) => {
			const statusDefinition = statusEffects.find((value) => value.statuses.includes(status));
			if (statusDefinition && statusDefinition.stats) {
				if (statusDefinition.mod > 0) {
					statusDefinition.stats.forEach((attribute) => this[attribute].upgrade());
				} else {
					statusDefinition.stats.forEach((attribute) => this[attribute].downgrade());
				}
			}
		});
	}
}
