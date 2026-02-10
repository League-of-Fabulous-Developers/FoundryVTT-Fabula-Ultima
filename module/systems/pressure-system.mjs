import { systemId } from '../helpers/system-utils.mjs';
import { SETTINGS } from '../settings.js';
import { FUHooks } from '../hooks.mjs';
import { FU } from '../helpers/config.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
import { Effects } from '../pipelines/effects.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { SectionChatBuilder } from '../helpers/section-chat-builder.mjs';
import { CommonSections } from '../checks/common-sections.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';

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

	// If this NPC is pressured because they are VU to the damage type,
	// AND the amount of HP loss is equal to or higher than 10 + half their level,
	// fill the clock by 2
	if (context.affinity === FU.affValue.vulnerability && context.amount >= 10 + Math.floor(context.actor.system.level.value / 2)) {
		pressureClock = await context.actor.updateProgress('pressure', 2);
	} else {
		pressureClock = await context.actor.updateProgress('pressure', 1);
	}

	let staggered = false;
	// If now at max, apply stagger
	if (pressureClock.isMaximum) {
		await Effects.toggleStatusEffect(context.actor, 'stagger', InlineSourceInfo.scene);
		const stagger = context.actor.resolveEffect('stagger');
		if (stagger) {
			/** @type NpcDataModel **/
			const npcData = context.actor.system;
			const changes = [];
			for (const [type, affinity] of Object.entries(npcData.affinities.all)) {
				if (affinity.current !== FU.affValue.immunity) {
					changes.push({
						key: `system.affinities.${type}.current`,
						mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						value: '-1',
						priority: 100,
					});
				}
			}
			staggered = true;
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
	let content = await FoundryUtils.renderTemplate('chat/chat-stagger-message', {
		sourceActor: context.sourceActor,
		actor: context.actor,
	});
	CommonSections.content(builder.sections, content);
	return builder.create();
}

/**
 * @param {CombatEvent} event
 * @returns {Promise<void>}
 */
async function onCombatEvent(event) {
	switch (event.type) {
		case FU.combatEvent.endOfRound:
			for (const actor of event.actors.filter((a) => a.type === 'npc')) {
				const stagger = actor.resolveEffect('stagger');
				if (stagger) {
					stagger.delete();
					const pressure = actor.resolveProgress('pressure');
					await actor.updateProgress('pressure', -pressure.current);
				}
			}
			break;

		case FU.combatEvent.endOfCombat:
			for (const actor of event.actors.filter((a) => a.type === 'npc')) {
				await removePressureEffect(actor);
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
				// If they somehow already have the pressure effect
				const pressure = actor.resolveEffect('pressure');
				if (pressure) {
					await pressure.delete();
				}
				// Toggle it on
				const segments = rank.value === 'champion' ? 2 + rank.replacedSoldiers * 2 : 4;
				const pressureData = await Effects.getEffectData('pressure');
				pressureData.system.rules.progress.max = segments;
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
