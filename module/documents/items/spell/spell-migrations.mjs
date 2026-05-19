import { Targeting } from '../../../helpers/targeting.mjs';
import { FU } from '../../../helpers/config.mjs';

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
	if (source.mpCost && !source.cost) {
		source.cost = {};
		source.cost.resource = 'mp';
		const costRegex = /^\s*(?<cost>\d*)/;
		const match = costRegex.exec(source.mpCost.value);
		source.cost.amount = match ? Number(match.groups.cost) : 0;
		// Delete old fields for clarity
		delete source.mpCost;
	}
	if (source.maxTargets && source.target && !source.targeting) {
		source.targeting = {};
		source.targeting.max = source.maxTargets.value;

		if (/weapon/i.test(source.target.value)) {
			source.targeting.rule = Targeting.rule.weapon;
		} else if (/special/i.test(source.target.value)) {
			source.targeting.rule = Targeting.rule.special;
		} else if (source.targeting.max > 1) {
			source.targeting.rule = Targeting.rule.multiple;
		} else if (source.targeting.max === 1) {
			source.targeting.rule = Targeting.rule.single;
		} else {
			source.targeting.rule = Targeting.rule.self;
		}

		// Delete old fields for clarity
		delete source.maxTargets;
		delete source.target;
	}
}

function migratePerTargetCost(source) {
	if (source.cost && source.targeting) {
		if (source.cost.perTarget == null && source.targeting.rule === Targeting.rule.multiple) {
			source.cost.perTarget = true;
		}
	}
}

function removeInvalidDuration(source) {
	if (source.duration?.value) {
		const foundDuration = Object.keys(FU.duration).find((e) => {
			return e === source.duration.value;
		});
		if (!foundDuration) {
			source.duration.value = 'instantaneous';
		}
	}
}

export class SpellMigrations {
	static run(source) {
		migrateQualityToOpportunity(source);
		migrateCostAndTargets(source);
		migratePerTargetCost(source);
		removeInvalidDuration(source);
	}
}
