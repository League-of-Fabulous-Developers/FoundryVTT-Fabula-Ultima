import { Checks } from './checks.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';
import { SupportCheck } from './support-check.mjs';
import FUApplication from '../ui/application.mjs';

/**
 * @typedef SupporterV2
 * @property {string} id
 * @property {string} messageId
 * @property {boolean} result
 * @property {('Admiration'|'Inferiority'|'Loyalty'|'Mistrust'|'Affection'|'Hatred')[]} [bond]
 */

/**
 * @typedef GroupCheckV2Flag
 * @property {string} id
 * @property {string} initiatingUser
 * @property {string} leader
 * @property {Attribute} primary
 * @property {Attribute} secondary
 * @property {number} checkDifficulty
 * @property {number} supportDifficulty
 * @property {boolean} [initiative]
 * @property {SupporterV2[]} supporters
 * @property {'open', 'completed', 'canceled'} [status]
 */

const groupCheckKey = 'groupCheck';

/**
 * @return void
 */
const onReadyResumeGroupChecks = () => {
	/** @type ChatMessage[] */
	const search = game.messages.search({
		filters: [
			{
				field: `flags.${SYSTEM}.${Flags.ChatMessage.GroupCheckV2}.initiatingUser`,
				value: game.user.id,
			},
			{
				field: `flags.${SYSTEM}.${Flags.ChatMessage.GroupCheckV2}.status`,
				negate: true,
				operator: foundry.applications.ux.SearchFilter.OPERATORS.CONTAINS,
				value: ['canceled', 'completed'],
			},
		],
	});
	for (const chatMessage of search) {
		const actor = ChatMessage.getSpeakerActor(chatMessage.speaker);
		/** @type GroupCheckV2Flag */
		const flag = chatMessage.getFlag(SYSTEM, Flags.ChatMessage.GroupCheckV2);
		Checks.groupCheck(actor, (check) => {
			check.type = flag.initiative ? 'initiative' : 'group';
			check.id = flag.id;
			check.primary = flag.primary;
			check.secondary = flag.secondary;
			check.additionalData[groupCheckKey] = {
				supportDifficulty: flag.supportDifficulty,
			};
			if (flag.initiative) {
				check.modifiers.push({
					label: 'FU.InitiativeBonus',
					value: actor.system.derived.init.value,
				});
			}
			if (flag.checkDifficulty) {
				CheckConfiguration.configure(check).setDifficulty(flag.checkDifficulty);
			}
		});
	}
};

/** @type CheckCallback */
const initGroupCheck = async (check, actor) => {
	/** @type {GroupCheckFlag}*/
	const checkConfig = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.DialogGroupCheckTitle') },
		label: game.i18n.localize('FU.DialogGroupCheckLabel'),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-group-check.hbs', {
			attributes: FU.attributes,
			difficulty: {
				check: 10,
				support: 10,
			},
			modifier: 0,
		}),
		/** @type {(jQuery) => GroupCheckFlag}*/
		ok: {
			callback: (event, button, dialog) => {
				const element = dialog.element;
				return {
					id: check.id,
					leader: actor.id,
					initiatingUser: game.user.id,
					attributes: {
						attr1: element.querySelector('[name=attributes\\.attr1]:checked').value,
						attr2: element.querySelector('[name=attributes\\.attr2]:checked').value,
					},
					difficulty: {
						check: element.querySelector('[name=difficulty\\.check]').value,
						support: element.querySelector('[name=difficulty\\.support]').value,
					},
					modifier: Number(element.querySelector('[name=modifier]').value),
					supporters: [],
				};
			},
		},
	});
	if (!checkConfig.attributes.attr1 || !checkConfig.attributes.attr2) {
		const msg = game.i18n.localize('FU.GroupCheckAttributeNotSelected');
		ui.notifications.error(msg);
		throw new Error(msg);
	}
	check.primary = checkConfig.attributes.attr1;
	check.secondary = checkConfig.attributes.attr2;
	if (checkConfig.difficulty.check) {
		CheckConfiguration.configure(check).setDifficulty(checkConfig.difficulty.check);
	}
	check.additionalData[groupCheckKey] = { supportDifficulty: checkConfig.difficulty.support };

	if (checkConfig.modifier) {
		check.modifiers.push({
			label: game.i18n.localize('FU.CheckSituationalModifier'),
			value: checkConfig.modifier,
		});
	}
};

/**
 * @type CheckCallback
 */
const waitForSupportChecks = async (check, actor, item) => {
	return new Promise((resolve, reject) => {
		const groupCheckApp = new GroupCheckApp(check, actor);
		const hookId = Hooks.on('closeGroupCheckApp', (app) => {
			if (app === groupCheckApp) {
				Hooks.off('closeGroupCheckApp', hookId);
				/** @type GroupCheckV2Flag */
				const groupCheckData = app.groupCheckData;
				if (groupCheckData.status === 'completed') {
					const supporters = groupCheckData.supporters;
					check.additionalData[groupCheckKey].supporters = supporters;

					let bondBonus = 0;

					for (const supporter of supporters) {
						if (supporter.result) {
							check.modifiers.push({
								label: game.i18n.format('FU.GroupCheckSupportCheckSuccess', { supporter: game.actors.get(supporter.id)?.name ?? `"???"` }),
								value: 1,
							});
							if (supporter.bond.length > bondBonus) {
								bondBonus = supporter.bond.length;
							}
						}
					}

					if (bondBonus) {
						check.modifiers.push({
							label: 'FU.GroupCheckSupportCheckStrongestBondBonus',
							value: bondBonus,
						});
					}

					resolve();
				} else {
					reject(game.i18n.localize('FU.ChatGroupCheckCanceled'));
				}
			}
		});
	});
};

/**
 * @type PrepareCheckHook
 */
const onPrepareGroupCheck = (check, actor, item, registerCallback) => {
	if (['group', 'initiative'].includes(check.type)) {
		registerCallback(waitForSupportChecks, Number.MAX_VALUE);
	}
};

class GroupCheckApp extends FUApplication {
	/**
	 * @type CheckId
	 */
	#groupCheckId;
	/**
	 * @type ChatMessage
	 */
	#chatMessage;
	/**
	 * @type number
	 */
	#hookId;

	/**
	 * @type ApplicationConfiguration
	 */
	static DEFAULT_OPTIONS = {
		window: { title: 'FU.GroupCheck' },
		position: {
			width: 300,
			height: 500,
		},
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		actions: {
			roll: GroupCheckApp.#roll,
			cancel: GroupCheckApp.#cancel,
		},
	};

	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/app/app-group-check.hbs',
		},
	};

	/**
	 * @param {import('./check-hooks.mjs').CheckV2} groupCheck
	 * @param {FUActor} actor
	 */
	constructor(groupCheck, actor) {
		super();
		this.#groupCheckId = groupCheck.id;
		this.#hookId = Hooks.on('renderChatMessageHTML', this.handleSupportCheck.bind(this));

		this.#chatMessage = game.messages
			.search({
				filters: [
					{
						field: `flags.${SYSTEM}.${Flags.ChatMessage.GroupCheckV2}.id`,
						value: this.#groupCheckId,
					},
				],
			})
			.at(0);
		if (!this.#chatMessage) {
			const inspector = CheckConfiguration.inspect(groupCheck);
			/** @type GroupCheckV2Flag */
			const groupCheckData = {
				id: groupCheck.id,
				initiatingUser: game.user.id,
				leader: actor.id,
				initiative: groupCheck.type === 'initiative',
				primary: groupCheck.primary,
				secondary: groupCheck.secondary,
				checkDifficulty: inspector.getDifficulty(),
				supportDifficulty: groupCheck.additionalData[groupCheckKey].supportDifficulty,
				supporters: [],
				status: 'open',
			};
			const flavorPromise = foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-check.hbs', { title: groupCheckData.initiative ? 'FU.InitiativeCheck' : 'FU.GroupRollCheck' });
			const contentPromise = this.#renderChatMessage(groupCheckData);
			Promise.all([flavorPromise, contentPromise])
				.then(([flavor, content]) =>
					ChatMessage.create({
						speaker: ChatMessage.implementation.getSpeaker({ actor: actor }),
						flavor: flavor,
						content: content,
						flags: {
							[SYSTEM]: {
								[Flags.ChatMessage.GroupCheckV2]: groupCheckData,
							},
						},
					}),
				)
				.then((chatMessage) => (this.#chatMessage = chatMessage))
				.then(() => this.render(true));
		} else if ((this.groupCheckData?.status ?? 'open') === 'open') {
			this.#synchronize();
			this.render(true);
		}
	}

	/**
	 * @param {GroupCheckV2Flag} groupCheck
	 * @return {Promise<string>}
	 */
	async #renderChatMessage(groupCheck) {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-group-check-initiated.hbs', {
			groupCheckId: groupCheck.id,
			leader: game.actors.get(groupCheck.leader),
			attributes: { attr1: groupCheck.primary, attr2: groupCheck.secondary },
			supporters: groupCheck.supporters.map((value) => ({
				name: game.actors.get(value.id).name,
				result: value.result,
				bond: value.bond,
			})),
			status: groupCheck.status ?? 'open',
		});
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		Object.assign(context, this.getData());
		return context;
	}

	getData(options = {}) {
		let groupCheck = this.groupCheckData;
		return {
			groupCheck: {
				...groupCheck,
				attributes: {
					attr1: groupCheck.primary,
					attr2: groupCheck.secondary,
				},
			},
			leader: game.actors.get(groupCheck.leader),
			supporters: Object.fromEntries(groupCheck.supporters.map((supporter) => [supporter.id, game.actors.get(supporter.id)])),
		};
	}

	/**
	 * @return {GroupCheckV2Flag}
	 */
	get groupCheckData() {
		return this.#chatMessage.getFlag(SYSTEM, Flags.ChatMessage.GroupCheckV2);
	}

	/**
	 * @param {GroupCheckV2Flag} groupCheckData
	 */
	set groupCheckData(groupCheckData) {
		this.#renderChatMessage(groupCheckData).then((value) =>
			this.#chatMessage.update({
				flags: {
					[SYSTEM]: {
						[Flags.ChatMessage.GroupCheckV2]: groupCheckData,
					},
				},
				content: value,
			}),
		);
	}

	static #roll() {
		this.close({ roll: true });
	}

	static #cancel() {
		this.close({ roll: false });
	}

	async close(options = {}) {
		if (!options.roll) {
			const cancel = await foundry.applications.api.DialogV2.confirm({
				window: { title: game.i18n.localize('FU.GroupCheckCancelDialogTitle') },
				options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
				content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-group-check-cancel.hbs'),
				rejectClose: false,
			});
			if (!cancel) {
				return;
			}
		}
		Hooks.off('renderChatMessageHTML', this.#hookId);
		const flag = this.groupCheckData;
		if (options.roll) {
			this.groupCheckData.status = 'completed';
		} else {
			this.groupCheckData.status = 'canceled';
		}
		this.groupCheckData = flag;
		return super.close(options);
	}

	#synchronize() {
		const groupCheck = this.groupCheckData;
		/** @type {ChatMessage[]} */
		const search = game.messages.search({
			filters: [
				{
					field: `flags.${SYSTEM}.${Flags.ChatMessage.CheckV2}.type`,
					value: 'support',
				},
			],
		});
		for (const message of search) {
			if (SupportCheck.isSupporting(this.#groupCheckId, message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2)) && !groupCheck.supporters.find((value) => value.messageId === message.id)) {
				/** @type CheckResultV2 */
				const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
				const actor = ChatMessage.getSpeakerActor(message.speaker);
				groupCheck.supporters = groupCheck.supporters.filter((supporter) => supporter.id !== actor.id);
				groupCheck.supporters.push({
					messageId: message.id,
					id: actor.id,
					result: check.critical || (check.result >= groupCheck.supportDifficulty && !check.fumble),
					bond: SupportCheck.getBond(check),
				});
			}
		}
		this.groupCheckData = groupCheck;
	}

	/**
	 * @param {ChatMessage} message
	 */
	handleSupportCheck(message) {
		/**
		 * @type CheckResultV2
		 */
		const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
		const actor = ChatMessage.getSpeakerActor(message.speaker);
		const groupCheck = this.groupCheckData;
		if (check && SupportCheck.isSupporting(groupCheck.id, check) && !groupCheck.supporters.find((supporter) => supporter.messageId === message.id)) {
			groupCheck.supporters = groupCheck.supporters.filter((supporter) => supporter.id !== actor.id);

			groupCheck.supporters.push({
				id: actor.id,
				messageId: message.id,
				result: check.critical || (check.result >= groupCheck.supportDifficulty && !check.fumble),
				bond: SupportCheck.getBond(check),
			});
			this.groupCheckData = groupCheck;

			this.render(true);
		}
	}
}

/**
 * @type {RenderCheckHook}
 */
const onRenderGroupCheck = (sections, check, actor) => {
	const { type, primary, modifierTotal, secondary, result, critical, fumble } = check;
	if (type === 'group' || type === 'initiative') {
		const inspector = CheckConfiguration.inspect(check);
		sections.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
			data: {
				result: {
					attr1: primary.result,
					attr2: secondary.result,
					die1: primary.dice,
					die2: secondary.dice,
					modifier: modifierTotal,
					total: result,
					crit: critical,
					fumble: fumble,
				},
				check: {
					attr1: {
						attribute: primary.attribute,
					},
					attr2: {
						attribute: secondary.attribute,
					},
				},
				difficulty: inspector.getDifficulty(),
				modifiers: check.modifiers,
			},
		});
	}
};

const initialize = () => {
	Hooks.once('ready', onReadyResumeGroupChecks);
	Hooks.on(CheckHooks.prepareCheck, onPrepareGroupCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderGroupCheck);
};

/** @type CheckCallback */
const initInitiativeCheck = (check, actor, item) => {
	check.type = 'initiative';
	check.primary = 'dex';
	check.secondary = 'ins';
	check.additionalData[groupCheckKey] = {
		supportDifficulty: 10,
	};
	if (actor.system.derived.init.value) {
		check.modifiers.push({
			label: 'FU.InitiativeBonus',
			value: actor.system.derived.init.value,
		});
	}
};

/**
 * @param {CheckV2} check
 * @param {number} supportDifficulty
 */
function setSupportCheckDifficulty(check, supportDifficulty) {
	check.additionalData[groupCheckKey] ??= {
		supportDifficulty,
	};
}

export const GroupCheck = Object.freeze({
	initialize,
	initInitiativeCheck,
	initGroupCheck,
	setSupportCheckDifficulty,
});
