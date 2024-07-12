import { SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { ChecksV2 } from './checks-v2.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { SpecialResults } from './special-results.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { CHECK_RESULT, CHECK_ROLL } from './default-section-order.mjs';

const SOURCE_CHECK = 'SourceCheck';

const isOpposableCheck = (li) => {
	const messageId = li.data('messageId');
	/** @type ChatMessage | undefined */
	const message = game.messages.get(messageId);
	if (ChecksV2.isCheck(message)) {
		const speaker = ChatMessage.getSpeakerActor(message);
		const character = canvas.tokens.controlled.at(0)?.document.actor || game.user.character;
		if (speaker !== character) {
			/** @type Check */
			const flag = message?.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			if (flag && flag.type === 'attribute') {
				return true;
			}
		}
	}
	return false;
};

const opposeCheck = async (li) => {
	const messageId = li.data('messageId');
	/** @type ChatMessage | undefined */
	const message = game.messages.get(messageId);
	/** @type CheckResultV2 */
	const sourceCheck = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
	if (sourceCheck) {
		const character = canvas.tokens.controlled.at(0)?.document.actor || game.user.character;
		await ChecksV2.opposedCheck(character, (check) => {
			check.primary = sourceCheck.primary.attribute;
			check.secondary = sourceCheck.secondary.attribute;
			check.additionalData[SOURCE_CHECK] = {
				id: sourceCheck.id,
				result: sourceCheck.result,
				fumble: sourceCheck.fumble,
				critical: sourceCheck.critical,
			};
			SpecialResults.skipRender(check);
		});
	}
};

const onGetChatLogEntryContext = (html, options) => {
	options.push({
		name: 'FU.ChatContextOppose',
		icon: '<i class="fas fa-down-left-and-up-right-to-center"></i>',
		group: SYSTEM,
		condition: isOpposableCheck,
		callback: opposeCheck,
	});
};

/**
 * @param {Check} check
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
	}
};

/**
 * @param {CheckSection[]} sections
 * @param {CheckResultV2}check
 * @param {FUActor}actor
 */
const onRenderCheck = (sections, check, actor) => {
	if (check.type === 'opposed') {
		const inspector = CheckConfiguration.inspect(check);
		sections.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
			data: {
				result: {
					attr1: check.primary.result,
					attr2: check.secondary.result,
					modifier: check.modifierTotal,
					total: check.result,
				},
				check: {
					attr1: {
						attribute: check.primary.attribute,
					},
					attr2: {
						attribute: check.secondary.attribute,
					},
				},
				difficulty: inspector.getDifficulty(),
				modifiers: check.modifiers,
			},
		});

		const sourceCheckData = check.additionalData[SOURCE_CHECK];

		/** @type ChatMessage */
		const sourceCheckMessage = game.messages
			.search({
				filters: [
					{
						field: `flags.${SYSTEM}.${Flags.ChatMessage.CheckV2}.id`,
						value: sourceCheckData.id,
					},
				],
			})
			.at(-1);
		const speakerActor = ChatMessage.getSpeakerActor(sourceCheckMessage.speaker);

		sections.push({
			order: CHECK_RESULT - 1,
			partial: 'systems/projectfu/templates/chat/partials/chat-opposed-check-details.hbs',
			data: {
				source: speakerActor.name,
				opponent: actor.name,
				fumble: sourceCheckData.fumble,
				critical: sourceCheckData.critical,
				result: sourceCheckData.result,
			},
		});

		let winner;
		if ((sourceCheckData.fumble && check.fumble) || (sourceCheckData.critical && check.critical) || sourceCheckData.result === check.result) {
			winner = null;
		} else if (sourceCheckData.fumble || check.critical || sourceCheckData.result < check.result) {
			winner = actor.name;
		} else {
			winner = speakerActor.name;
		}

		sections.push({
			order: CHECK_RESULT,
			partial: 'systems/projectfu/templates/chat/partials/chat-opposed-check-result.hbs',
			data: {
				winner: winner,
			},
		});
	}
};

function initialize() {
	Hooks.on('getChatLogEntryContext', onGetChatLogEntryContext);
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
}

export const OpposedCheck = Object.freeze({
	initialize,
});
