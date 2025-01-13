import { Targeting } from '../../../helpers/targeting.mjs';

function migrateQualityToOpportunity(source) {
	if ('quality' in source && source.quality.value && !('opportunity' in source)) {
		source.opportunity = source.quality.value;
		delete source.quality;
	}
}

/**
 * @param {SpellDataModel} source
 */
function migrateCostAndTargets(source) {
	if (source.mpCost && source.cost && source.targeting) {
		source.cost.resource = 'mp';
		source.cost.amount = source.mpCost.value;
		source.targeting.max = source.maxTargets.value;

		if (source.targeting.max > 1) {
			source.targeting.rule = Targeting.rule.multiple;
		} else if (source.targeting.max === 1) {
			source.targeting.rule = Targeting.rule.single;
		} else {
			source.targeting.rule = Targeting.rule.self;
		}

		// Delete old properties?
		delete source.mpCost;
		delete source.maxTargets;
		delete source.target;
	}
}

export class SpellMigrations {
	static run(source) {
		migrateQualityToOpportunity(source);
		migrateCostAndTargets(source);
	}
}
