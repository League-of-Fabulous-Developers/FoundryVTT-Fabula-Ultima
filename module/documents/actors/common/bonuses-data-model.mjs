import { AccuracyBonusesDataModel } from './accuracy-bonuses-data-model.mjs';
import { DamageBonusesDataModel } from './damage-bonuses-data-model.mjs';

/**
 * @property {AccuracyBonusesDataModel} accuracy
 * @property {DamageBonusesDataModel} damage
 */
export class BonusesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { EmbeddedDataField } = foundry.data.fields;
		return {
			accuracy: new EmbeddedDataField(AccuracyBonusesDataModel, {}),
			damage: new EmbeddedDataField(DamageBonusesDataModel, {}),
		};
	}

	recovery = {
		hp: 0,
		mp: 0,
		ip: 0,
	};
}
