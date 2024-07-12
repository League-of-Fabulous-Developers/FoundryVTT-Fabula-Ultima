import { FU, SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { createCheckMessage, rollCheck } from './checks.mjs';

/**
 * @typedef Supporter
 * @property {string} id
 * @property {string} messageId
 * @property {boolean} result
 * @property {("Admiration"|"Inferiority"|"Loyalty"|"Mistrust"|"Affection"|"Hatred")[]} [bond]
 */

/**
 * @typedef GroupCheckFlag
 * @property {string} id
 * @property {string} initiatingUser
 * @property {string} leader
 * @property {Object} attributes
 * @property {string} attributes.attr1
 * @property {string} attributes.attr2
 * @property {Object} difficulty
 * @property {number} difficulty.check
 * @property {number} difficulty.support
 * @property {boolean} [initiative]
 * @property {Supporter[]} supporters
 * @property {"open", "completed", "canceled"} [status]
 */

/**
 * @typedef SupportCheckFlag
 * @property {string} groupCheckId
 * @property {string} supporterId
 * @property {number} difficulty
 * @property {boolean} result
 * @property {("Admiration"|"Inferiority"|"Loyalty"|"Mistrust"|"Affection"|"Hatred")[]} [bond]
 */

/**
 * @param {GroupCheckFlag} groupCheck
 * @return {Promise<void>}
 */
async function handleSupportCheck(groupCheck) {
	const character = canvas.tokens.controlled.at(0)?.document.actor || game.user.character;
	if (!character) {
		ui.notifications.error('FU.GroupCheckMissingCharacter', { localize: true });
		return;
	}
	if (character.type !== 'character') {
		ui.notifications.error('FU.GroupCheckNotPlayerCharacter', { localize: true });
		return;
	}
	if (character.id === groupCheck.leader) {
		ui.notifications.error('FU.GroupCheckLeaderCantSupport', { localize: true });
		return;
	}
	if (groupCheck.supporters.find((supporter) => supporter.id === character.id)) {
		ui.notifications.error('FU.GroupCheckAlreadySupported', { localize: true });
		return;
	}

	const bonds = (character.system.resources.bonds ?? [])
		.map((bond) => {
			const feelings = [];
			bond.admInf.length && feelings.push(bond.admInf);
			bond.loyMis.length && feelings.push(bond.loyMis);
			bond.affHat.length && feelings.push(bond.affHat);
			return { name: bond.name, feelings };
		})
		.filter((value) => value.feelings.length);

	let bond;
	try {
		bond = await Dialog.prompt({
			title: game.i18n.localize('FU.GroupCheckBondDialogTitle'),
			label: game.i18n.localize('FU.GroupCheckBondDialogLabel'),
			options: { classes: ['unique-dialog', 'backgroundstyle'] },
			content: await renderTemplate('systems/projectfu/templates/dialog/dialog-group-check-support-bond.hbs', {
				leader: game.actors.get(groupCheck.leader).name,
				bonds,
			}),
			callback: (jQuery) => {
				const selected = jQuery.find('[name=bond]:checked').val();
				return bonds[selected]?.feelings ?? [];
			},
		});
	} catch (e) {
		ui.notifications.info('FU.GroupCheckSupportCanceled', { localize: true });
		return;
	}

	const { attr1, attr2 } = groupCheck.attributes;
	/**
	 * @type {CheckParameters}
	 */
	const checkParams = {
		check: {
			attr1: {
				attribute: attr1,
				dice: character.system.attributes[attr1].current,
			},
			attr2: {
				attribute: attr2,
				dice: character.system.attributes[attr2].current,
			},
			modifier: groupCheck.initiative ? character.system.derived.init.value : 0,
			bonus: 0,
			title: 'FU.SupportCheck',
		},
		difficulty: groupCheck.difficulty.support,
		speaker: ChatMessage.implementation.getSpeaker({ actor: character }),
	};
	const check = await rollCheck(checkParams);
	/** @type SupportCheckFlag */
	const supportCheckFlag = {
		groupCheckId: groupCheck.id,
		supporterId: character.id,
		difficulty: groupCheck.difficulty.support,
		bond: bond,
	};
	await createCheckMessage(check, {
		[SYSTEM]: {
			[Flags.ChatMessage.SupportCheck]: supportCheckFlag,
		},
	});
}

Hooks.on('preCreateChatMessage', handleSupportCheckResults);

/**
 * @param {ChatMessage} message
 */
function handleSupportCheckResults(message) {
	const check = message.flags[SYSTEM]?.[Flags.ChatMessage.CheckParams];
	const support = message.flags[SYSTEM]?.[Flags.ChatMessage.SupportCheck];
	if (check && support) {
		message.updateSource({
			flags: {
				[SYSTEM]: {
					[Flags.ChatMessage.SupportCheck]: {
						result: check.result.crit || check.result.total >= support.difficulty,
					},
				},
			},
		});
	}
}

/**
 * @param {ChatMessage} message
 * @param {jQuery} jQuery
 */
function attachSupportCheckListener(message, jQuery) {
	/**
	 * @type GroupCheckFlag
	 */
	const groupCheck = message.getFlag(SYSTEM, Flags.ChatMessage.GroupCheck);
	if (groupCheck) {
		jQuery.find(`button[data-support=${groupCheck.id}]`).click(async function () {
			$(this).attr('disabled', true);
			await handleSupportCheck(groupCheck);
			$(this).attr('disabled', false);
		});
	}
}

Hooks.on('renderChatMessage', attachSupportCheckListener);

Hooks.once('ready', () => {
	/** @type ChatMessage[] */
	const search = game.messages.search({
		filters: [
			{
				field: `flags.${SYSTEM}.${Flags.ChatMessage.GroupCheck}.initiatingUser`,
				value: game.user.id,
			},
			{
				field: `flags.${SYSTEM}.${Flags.ChatMessage.GroupCheck}.status`,
				negate: true,
				operator: SearchFilter.OPERATORS.CONTAINS,
				value: ['canceled', 'completed'],
			},
		],
	});
	for (const chatMessage of search) {
		new GroupCheck(chatMessage.getFlag(SYSTEM, Flags.ChatMessage.GroupCheck).id);
	}
});

export class GroupCheck extends Application {
	/**
	 * @type string
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
	 * @param {FUActor} leader
	 * @param {boolean} initiative is this an initiative check?
	 * @return {Promise<void>}
	 */
	static async promptCheck(leader, initiative) {
		const groupCheckId = foundry.utils.randomID();

		/**
		 * @type GroupCheckFlag
		 */
		let groupCheck;
		if (!initiative) {
			groupCheck = await Dialog.prompt({
				title: game.i18n.localize('FU.DialogGroupCheckTitle'),
				label: game.i18n.localize('FU.DialogGroupCheckLabel'),
				options: { classes: ['unique-dialog', 'backgroundstyle'] },
				content: await renderTemplate('systems/projectfu/templates/dialog/dialog-group-check.hbs', {
					attributes: FU.attributes,
					difficulty: {
						check: 10,
						support: 10,
					},
				}),
				/** @type {(jQuery) => GroupCheckFlag}*/
				callback: (jQuery) => ({
					id: groupCheckId,
					leader: leader.id,
					initiatingUser: game.user.id,
					attributes: {
						attr1: jQuery.find('[name=attributes\\.attr1]:checked').val(),
						attr2: jQuery.find('[name=attributes\\.attr2]:checked').val(),
					},
					difficulty: {
						check: jQuery.find('[name=difficulty\\.check]').val(),
						support: jQuery.find('[name=difficulty\\.support]').val(),
					},
					supporters: [],
				}),
				rejectClose: false,
			});
		} else {
			groupCheck = {
				id: groupCheckId,
				leader: leader.id,
				initiatingUser: game.user.id,
				attributes: {
					attr1: 'dex',
					attr2: 'ins',
				},
				difficulty: {
					check: 0,
					support: 10,
				},
				initiative: true,
				supporters: [],
			};
		}

		if (!groupCheck) {
			return;
		}
		if (!groupCheck.attributes.attr1 || !groupCheck.attributes.attr2) {
			ui.notifications.error('FU.GroupCheckAttributeNotSelected', { localize: true });
			return;
		}

		await ChatMessage.create({
			speaker: ChatMessage.implementation.getSpeaker({ actor: leader }),
			flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-check.hbs', { title: groupCheck.initiative ? 'FU.InitiativeCheck' : 'FU.GroupRollCheck' }),
			content: await GroupCheck.#renderChatMessage(groupCheck),
			flags: {
				[SYSTEM]: {
					[Flags.ChatMessage.GroupCheck]: groupCheck,
				},
			},
		});

		new GroupCheck(groupCheckId);
	}

	/**
	 * @param {GroupCheckFlag} groupCheck
	 * @return {Promise<string>}
	 */
	static async #renderChatMessage(groupCheck) {
		return renderTemplate('systems/projectfu/templates/chat/chat-group-check-initiated.hbs', {
			groupCheckId: groupCheck.id,
			leader: game.actors.get(groupCheck.leader),
			attributes: groupCheck.attributes,
			supporters: groupCheck.supporters.map((value) => ({
				name: game.actors.get(value.id).name,
				result: value.result,
				bond: value.bond,
			})),
			status: groupCheck.status ?? 'open',
		});
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			width: 300,
			height: 500,
			title: game.i18n.localize('FU.GroupCheck'),
			classes: ['unique-dialog', 'backgroundstyle'],
		});
	}

	/**
	 * @param {string} groupCheckId
	 */
	constructor(groupCheckId) {
		super();
		this.#groupCheckId = groupCheckId;
		this.#chatMessage = game.messages
			.search({
				filters: [
					{
						field: `flags.${SYSTEM}.${Flags.ChatMessage.GroupCheck}.id`,
						value: this.#groupCheckId,
					},
				],
			})
			.at(0);
		if (!this.#chatMessage) {
			throw Error(`No group check found with id ${this.#groupCheckId}`);
		}
		if ((this.groupCheckData.status ?? 'open') === 'open') {
			this.#synchronize();

			this.#hookId = Hooks.on('renderChatMessage', this.handleSupportCheck.bind(this));

			this.render(true);
		}
	}

	get template() {
		return 'systems/projectfu/templates/app/app-group-check.hbs';
	}

	getData(options = {}) {
		let groupCheck = this.groupCheckData;
		return {
			groupCheck: groupCheck,
			leader: game.actors.get(groupCheck.leader),
			supporters: groupCheck.supporters.reduce(
				(previousValue, currentValue) => ({
					...previousValue,
					[currentValue.id]: game.actors.get(currentValue.id),
				}),
				{},
			),
		};
	}

	/**
	 * @return {GroupCheckFlag}
	 */
	get groupCheckData() {
		return this.#chatMessage.getFlag(SYSTEM, Flags.ChatMessage.GroupCheck);
	}

	/**
	 * @param {GroupCheckFlag} groupCheckData
	 */
	set groupCheckData(groupCheckData) {
		GroupCheck.#renderChatMessage(groupCheckData).then((value) =>
			this.#chatMessage.update({
				flags: {
					[SYSTEM]: {
						[Flags.ChatMessage.GroupCheck]: groupCheckData,
					},
				},
				content: value,
			}),
		);
	}

	activateListeners(html) {
		super.activateListeners(html);
		html.find('button[data-type=group-check][data-action=roll]').click(() => this.close({ roll: true }));
		html.find('button[data-type=group-check][data-action=cancel]').click(() => this.close({ roll: false }));
	}

	async close(options = {}) {
		if (!options.roll) {
			const cancel = await Dialog.confirm({
				title: game.i18n.localize('FU.GroupCheckCancelDialogTitle'),
				options: { classes: ['unique-dialog', 'backgroundstyle'] },
				content: await renderTemplate('systems/projectfu/templates/dialog/dialog-group-check-cancel.hbs'),
				rejectClose: false,
			});
			if (!cancel) {
				return;
			}
		}
		Hooks.off('renderChatMessage', this.#hookId);
		if (options.roll) {
			/** @type GroupCheckFlag */
			const flag = this.groupCheckData;
			const { attr1, attr2 } = flag.attributes;
			const successfulSupports = flag.supporters.filter((value) => value.result);
			let leader = game.actors.get(flag.leader);
			const {
				system: { attributes, derived },
			} = leader;
			/**
			 * @type {CheckParameters}
			 */
			const check = {
				check: {
					attr1: {
						attribute: attr1,
						dice: attributes[attr1].current,
					},
					attr2: {
						attribute: attr2,
						dice: attributes[attr2].current,
					},
					modifier: flag.initiative ? derived.init.value + successfulSupports.length : successfulSupports.length,
					bonus: successfulSupports.reduce((biggestBond, currentValue) => Math.max(biggestBond, currentValue.bond?.length ?? 0), 0),
					title: flag.initiative ? 'FU.InitiativeCheck' : 'FU.GroupRollCheck',
				},
				difficulty: flag.difficulty.check,
				speaker: ChatMessage.implementation.getSpeaker({ actor: leader }),
			};
			await createCheckMessage(await rollCheck(check));
			this.groupCheckData = { ...flag, status: 'completed' };
		} else {
			this.groupCheckData = { ...this.groupCheckData, status: 'canceled' };
		}
		await super.close(options);
	}

	#synchronize() {
		const data = this.groupCheckData;
		/** @type {ChatMessage[]} */
		const search = game.messages.search({
			filters: [
				{
					field: `flags.${SYSTEM}.${Flags.ChatMessage.SupportCheck}.groupCheckId`,
					value: this.#groupCheckId,
				},
			],
		});
		for (const message of search) {
			if (!data.supporters.find((value) => value.messageId === message.id)) {
				/** @type SupportCheckFlag */
				const flag = message.getFlag(SYSTEM, Flags.ChatMessage.SupportCheck);
				data.supporters = data.supporters.filter((value) => value.id !== flag.supporterId);
				data.supporters.push({
					messageId: message.id,
					id: flag.supporterId,
					result: flag.result,
					bond: flag.bond,
				});
			}
		}
		this.groupCheckData = data;
	}

	/**
	 * @param {ChatMessage} message
	 */
	handleSupportCheck(message) {
		/**
		 * @type SupportCheckFlag
		 */
		const supportCheck = message.getFlag(SYSTEM, Flags.ChatMessage.SupportCheck);
		const flag = this.groupCheckData;
		if (supportCheck && supportCheck.groupCheckId === this.#groupCheckId && !flag.supporters.find((value) => value.messageId === message.id)) {
			flag.supporters = flag.supporters.filter((value) => value.id !== supportCheck.supporterId);

			flag.supporters.push({
				id: supportCheck.supporterId,
				messageId: message.id,
				result: supportCheck.result,
				bond: supportCheck.bond,
			});
			this.groupCheckData = flag;

			this.render(true);
		}
	}
}
