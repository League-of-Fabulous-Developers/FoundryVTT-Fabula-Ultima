import { Targeting } from '../../../helpers/targeting.mjs';
import { FU } from '../../../helpers/config.mjs';

/**
 * @property {TargetingRule} rule The type of targeting rule to use
 * @property {Number} max The maximum number of targets
 */
export class TargetingDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField } = foundry.data.fields;
		return {
			rule: new StringField({ initial: Targeting.rule.special, choices: Object.keys(Targeting.rule), required: true }),
			max: new NumberField({ initial: 0, min: 0, max: 5, integer: true, nullable: false }),
		};
	}

	getTargetTranslationKey() {
		const { rule, max } = this;
		if (rule === Targeting.rule.self) {
			return FU.target.self;
		}
		if (rule === Targeting.rule.single) {
			return FU.target.oneCreature;
		}
		if (rule === Targeting.rule.weapon) {
			return FU.target.oneWeapon;
		}
		if (rule === Targeting.rule.multiple) {
			switch (max) {
				case 1:
					return FU.target.oneCreature;
				case 2:
					return FU.target.twoCreature;
				case 4:
					return FU.target.fourCreature;
				case 5:
					return FU.target.fiveCreature;
				default:
					return FU.target.threeCreature;
			}
		}
		return FU.targetingRules.special;
	}
}
