import { systemId } from '../helpers/system-utils.mjs';
import { SETTINGS } from '../settings.js';
import { FUHooks } from '../hooks.mjs';

// /**
//  * @param {DamagePipelineContext} context
//  * @returns {Number}
//  */
// function scaleDamage(context) {
// 	const derivedData = context.actor.system.derived;
// 	const flatFactor = 0.5;
// 	const scalingFactor = 0.0125;
//
// 	// TODO: Some magic formulas
// 	let flatDR;
// 	let scalingDR;
// 	if (context.damageType === 'physical') {
// 		flatDR = derivedData.def.value * flatFactor;
// 		scalingDR = derivedData.def.value * scalingFactor;
// 	} else {
// 		flatDR = derivedData.mdef.value * flatFactor;
// 		scalingDR = derivedData.def.value * scalingFactor;
// 	}
//
// 	// Flat damage reduction
// 	context.addBonus('Flat Damage Reduction', -flatDR);
// 	// Scaling damage reduction
// 	context.addModifier('Scaling Damage Reduction', 1 - scalingDR);
// }

/**
 * @param {DamagePipelineContext} context
 */
function process(context) {
	// TODO: Apply stagger status effect if pressure clock filled
}

/**
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function onCombatEvent(event) {
	switch (event.type) {
		// TODO: Add pressure clocks to all elites/champions
		case 'startOfCombat':
			break;
		// TODO: Remove all pressure clocks
		case 'endOfCombat':
			break;
		// TODO: Empty pressure clock for all staggered
		case 'endOfRound':
			break;
	}
}

function initialize() {
	if (!game.settings.get(systemId, SETTINGS.pressureSystem)) {
		return;
	}
	Hooks.on(FUHooks.COMBAT_EVENT, onCombatEvent);
}

export const PressureSystem = Object.freeze({
	initialize,
	process,
});
