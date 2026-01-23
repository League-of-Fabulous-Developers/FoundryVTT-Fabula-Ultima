import { FU, SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { CHECK_ADDENDUM_ORDER, CHECK_DETAILS, CHECK_ROLL } from './default-section-order.mjs';
import { CommonSections } from './common-sections.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { systemId } from '../helpers/system-utils.mjs';
import { Pipeline } from '../pipelines/pipeline.mjs';
import { CheckPrompt } from './check-prompt.mjs';
import { getSelected } from '../helpers/target-handler.mjs';

const critThresholdFlag = 'critThreshold.opposedCheck';
const actionName = 'opposeCheck';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 */
const onPrepareCheck = (check, actor) => {
	if (check.type === 'opposed') {
		if (actor.system.bonuses.accuracy.opposedCheck) {
			check.modifiers.push({
				label: 'FU.OpposedCheckBonusGeneric',
				value: actor.system.bonuses.accuracy.opposedCheck,
			});
		}

		const flag = actor.getFlag(SYSTEM, critThresholdFlag);
		if (flag) {
			check.critThreshold = Math.min(check.critThreshold, Number(flag));
		}
	}
};

/**
 * @type RenderCheckHook
 */
const onRenderCheck = (sections, check, actor, item, flags) => {
	if (check.type === 'opposed') {
		const inspector = CheckConfiguration.inspect(check);
		const initialCheck = inspector.getInitialCheck();
		sections.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
			data: {
				result: {
					attr1: check.primary.result,
					attr2: check.secondary.result,
					die1: check.primary.dice,
					die2: check.secondary.dice,
					modifier: check.modifierTotal,
					total: check.result,
					crit: check.critical,
					fumble: check.fumble,
				},
				check: {
					attr1: {
						attribute: check.primary.attribute,
					},
					attr2: {
						attribute: check.secondary.attribute,
					},
					type: check.type,
				},
				initialCheck: initialCheck,
				difficulty: initialCheck ? initialCheck.result : null,
				modifiers: check.modifiers,
			},
		});

		// Meaning this check is OPPOSING the initial check
		if (initialCheck) {
			const initialActor = fromUuidSync(initialCheck.actorUuid);
			// Resolve winner
			let winner;
			let margin = 0;
			if ((initialCheck.fumble && check.fumble) || (initialCheck.critical && check.critical) || initialCheck.result === check.result) {
				winner = null;
			} else if (initialCheck.fumble || check.critical || initialCheck.result < check.result) {
				winner = actor.name;
				margin = check.result - initialCheck.result;
			} else {
				winner = initialActor.name;
				margin = initialCheck.result - check.result;
			}
			CommonSections.template(
				sections,
				'chat/partials/chat-opposed-check-details',
				{
					actor,
					initialActor,
					winner,
					margin,
				},
				CHECK_DETAILS,
			);
			CommonSections.template(
				sections,
				'chat/partials/chat-opposed-check-result',
				{
					winner,
				},
				CHECK_ADDENDUM_ORDER,
			);
		}
		//
		else {
			const tooltip = StringUtils.localize('FU.ChatContextOppose');
			Pipeline.toggleFlag(flags, Flags.ChatMessage.OpposedCheck);
			/** @type OpposedCheckData **/
			const data = {
				initialCheck: check,
			};
			const action = new ChatAction(actionName, FU.checkIcons.opposed, tooltip).withLabel(tooltip).withSelected().withFields(data);
			CommonSections.chatActions(sections, [action], CHECK_ADDENDUM_ORDER);
		}
	}
};

/**
 * @typedef OpposedCheckData
 * @property {CheckResultV2} initialCheck The original check.
 */

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function onRenderChatMessage(message, html) {
	if (message.getFlag(systemId, Flags.ChatMessage.OpposedCheck)) {
		Pipeline.handleClick(message, html, actionName, async (dataset) => {
			/** @type OpposedCheckData **/
			const data = StringUtils.fromBase64(dataset.fields);
			const selected = await getSelected();
			if (selected.length !== 1) {
				return;
			}
			const actor = selected[0];
			if (data.initialCheck.actorUuid === actor.uuid) {
				ui.notifications.warn(`Thou cannot oppose thyself.`);
				return;
			}
			return CheckPrompt.opposedCheck(actor, data);
		});
	}
}

function initialize() {
	Hooks.on('renderChatMessageHTML', onRenderChatMessage);
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
}

export const OpposedCheck = Object.freeze({
	initialize,
});
