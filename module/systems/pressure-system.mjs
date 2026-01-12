import { systemId } from '../helpers/system-utils.mjs';
import { SETTINGS } from '../settings.js';
import { FUHooks } from '../hooks.mjs';
import { FU } from '../helpers/config.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
import { Effects } from '../pipelines/effects.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { SectionChatBuilder } from '../helpers/section-chat-builder.mjs';
import { CommonSections } from '../checks/common-sections.mjs';

/**
 * @typedef PressureProcessResult
 * @property {String} content
 * @property {Boolean} staggered
 */

/**
 * @param {DamagePipelineContext} context
 * @return {PressureProcessResult}
 */
async function processVulnerability(context) {
	if (context.actor.type !== 'npc') {
		return null;
	}

	let pressureClock = context.actor.resolveEffect('pressure');
	if (!pressureClock) {
		return null;
	}

	// TODO: Refactor to not have to re-resolve
	pressureClock = await context.actor.updateProgress('pressure', 1);
	let staggered = false;
	// If now at max, apply stagger
	if (pressureClock.isMaximum) {
		await Effects.toggleStatusEffect(context.actor, 'stagger', InlineSourceInfo.scene);
		const stagger = context.actor.resolveEffect('stagger');
		if (stagger) {
			/** @type NpcDataModel **/
			const npcData = context.actor.system;
			const changes = [];
			for (const [type] of Object.entries(npcData.affinities.all)) {
				changes.push({
					key: `system.affinities.${type}`,
					mode: 0,
					value: 'downgrade',
				});
				staggered = true;
			}
			await stagger.update({
				changes: changes,
			});
		}
	}
	const content = await ProgressDataModel.renderDetails(pressureClock, null, true);
	return {
		content,
		staggered,
	};
}

/**
 * @param {DamagePipelineContext} context
 * @returns {Promise<void>}
 */
async function createStaggerChatMessage(context) {
	let builder = new SectionChatBuilder(context.sourceActor, context.item);
	CommonSections.genericText(builder.sections, 'I HAVE STAGGERED THEE');
	return builder.create();
}

/**
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function onCombatEvent(event) {
	switch (event.type) {
		// TODO: Empty pressure clock for all staggered
		case FU.combatEvent.endOfRound:
			for (const actor of event.actors.filter((a) => a.type === 'npc')) {
				const se = actor.resolveEffect('stagger');
				if (se) {
					// Delete the stagger effect
					se.delete();
					// Reset pressure
					const pressure = actor.resolveProgress('pressure');
					await actor.updateProgress('pressure', -pressure.current);
				}
			}
			break;
	}
}

async function applyPressureEffect(actor) {
	const rank = actor.system.rank;
	switch (rank.value) {
		case 'champion':
		case 'elite':
			{
				const pressureData = await Effects.getEffectData('pressure');
				pressureData.system.rules.progress.max = rank.value === 'champion' ? 2 + rank.replacedSoldiers * 2 : 4;
				if (pressureData) {
					await Effects.toggleStatusEffect(actor, 'pressure', InlineSourceInfo.scene);
				}
			}
			break;

		default:
			break;
	}
}

async function removePressureEffect(actor) {
	const rank = actor.system.rank.value;
	switch (rank) {
		case 'champion':
		case 'elite':
			{
				const pi = actor.resolveEffect('pressure');
				if (pi) {
					pi.delete();
				}
				const stagger = actor.resolveEffect('stagger');
				if (stagger) {
					stagger.delete();
				}
			}
			break;

		default:
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
	processVulnerability,
	applyPressureEffect,
	removePressureEffect,
	createStaggerChatMessage,
});
