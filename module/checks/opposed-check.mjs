import { SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Checks } from './checks.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { SpecialResults } from './special-results.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { CHECK_RESULT, CHECK_ROLL } from './default-section-order.mjs';

const SOURCE_CHECK = 'SourceCheck';

const isOpposableCheck = (li) => {
	const messageId = li.dataset.messageId;
	/** @type ChatMessage | undefined */
	const message = game.messages.get(messageId);
	if (Checks.isCheck(message, 'attribute')) {
		const speaker = ChatMessage.getSpeakerActor(message);
		const character = canvas.tokens.controlled.at(0)?.document.actor || game.user.character;
		if (speaker !== character) {
			return true;
		}
	}
	return false;
};

const opposeCheck = async (li) => {
	const messageId = li.dataset.messageId;
	/** @type ChatMessage | undefined */
	const message = game.messages.get(messageId);
	/** @type CheckResultV2 */
	const sourceCheck = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
	if (sourceCheck) {
		const character = canvas.tokens.controlled.at(0)?.document.actor || game.user.character;
		const opposedCheckBonus = character.system.bonuses.accuracy.opposedCheck || 0;
		await Checks.opposedCheck(character, async (check) => {
			check.primary = sourceCheck.primary.attribute;
			check.secondary = sourceCheck.secondary.attribute;
			check.additionalData[SOURCE_CHECK] = {
				id: sourceCheck.id,
				result: sourceCheck.result,
				fumble: sourceCheck.fumble,
				critical: sourceCheck.critical,
			};
			SpecialResults.skipRender(check);
			const result = await foundry.applications.api.DialogV2.prompt({
				window: { title: game.i18n.localize('FU.OpposedCheckBonusDialog') },
				label: game.i18n.localize('FU.Submit'),
				content: `
                <fieldset class="flexcol resource-content">
                  <legend class="resource-text-m">
                    ${game.i18n.localize('FU.OpposedCheckBonusDialogBonus')}
                  </legend>
				  <label for="opposedCheckGlobalBonus">
					${game.i18n.localize('FU.OpposedCheckBonusGeneric')}: 
					<span id="opposedCheckGlobalBonusValue">${opposedCheckBonus}</span>
				  </label>
                  <label for="opposedCheckBonus">
                    ${game.i18n.localize('FU.OpposedCheckBonusDialogBonusLabel')}
                    <input id="opposedCheckBonus" type="number" name="bonus" value="0">
                  </label>
                  <label for="opposedCheckBonusDescription">
                    ${game.i18n.localize('FU.OpposedCheckBonusDialogDescriptionLabel')}
                    <input id="opposedCheckBonusDescription" type="text" name="description" placeholder="${game.i18n.localize('FU.OpposedCheckBonusDialogDescriptionPlaceholder')}">
                  </label>
                </fieldset>
                `,
				rejectClose: false,
				ok: {
					callback: (event, button, dialog) => {
						const element = dialog.element;
						return {
							bonus: Number(element.querySelector('[name=bonus]').value),
							name: element.querySelector('[name=description]').value.trim(),
						};
					},
				},
				options: {
					classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
				},
			});
			if (result.bonus && Number.isInteger(result.bonus)) {
				check.modifiers.push({
					label: result.name || game.i18n.localize('FU.OpposedCheckBonusDialogDescriptionPlaceholder'),
					value: result.bonus,
				});
			}
		});
	}
};

const onGetChatLogEntryContext = (application, menuItems) => {
	menuItems.push({
		name: 'FU.ChatContextOppose',
		icon: '<i class="fas fa-down-left-and-up-right-to-center"></i>',
		group: SYSTEM,
		condition: isOpposableCheck,
		callback: opposeCheck,
	});
};

const critThresholdFlag = 'critThreshold.opposedCheck';

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
			order: CHECK_ROLL - 1,
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
		let margin = 0;
		if ((sourceCheckData.fumble && check.fumble) || (sourceCheckData.critical && check.critical) || sourceCheckData.result === check.result) {
			winner = null;
		} else if (sourceCheckData.fumble || check.critical || sourceCheckData.result < check.result) {
			winner = actor.name;
			margin = check.result - sourceCheckData.result;
		} else {
			winner = speakerActor.name;
			margin = sourceCheckData.result - check.result;
		}

		sections.push({
			order: CHECK_RESULT,
			partial: 'systems/projectfu/templates/chat/partials/chat-opposed-check-result.hbs',
			data: {
				winner: winner,
				margin: margin,
			},
		});
	}
};

function initialize() {
	Hooks.on('getChatMessageContextOptions', onGetChatLogEntryContext);
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
}

export const OpposedCheck = Object.freeze({
	initialize,
});
