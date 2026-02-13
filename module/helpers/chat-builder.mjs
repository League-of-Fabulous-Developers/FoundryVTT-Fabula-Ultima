import FoundryUtils from './foundry-utils.mjs';

/**
 * @typedef FUChatData
 * @property {CheckRenderData} sections
 * @property {Promise[]} postRenderActions
 */

/**
 * @desc Builder of actionable chat messages for the system.
 */
export class FUChatBuilder {
	/**
	 * @type {CheckRenderData} The sections of that chat message.
	 */
	#renderData = [];
	/**
	 * @type {Object}
	 */
	#flags;
	/**
	 * @type {FUActor}
	 */
	#actor;
	/**
	 * @type {FUItem}
	 */
	#item;
	/**
	 * @type {(Roll|Object)[]}
	 */
	#rolls;
	/**
	 * @type {String} Custom flavor text.
	 */
	#flavor;
	/**
	 * @type {Promise[]} Actions to execute after rendering the chat message.
	 */
	#postRenderActions;

	constructor(actor, item) {
		this.#actor = actor;
		this.#item = item;
		this.#flags = {};
		this.#postRenderActions = [];
	}

	/**
	 * @returns {FUActor}
	 */
	get actor() {
		return this.#actor;
	}

	/**
	 * @returns {FUItem}
	 */
	get item() {
		return this.#item;
	}

	/**
	 * @returns {CheckRenderData}
	 */
	get sections() {
		return this.#renderData;
	}

	/**
	 * @returns {CheckRenderData}
	 */
	get renderData() {
		return this.#renderData;
	}

	/**
	 * @returns {Object}
	 */
	get flags() {
		return this.#flags;
	}

	withFlags(flags) {
		this.#flags = flags;
		return this;
	}

	withRolls(rolls) {
		this.#rolls = rolls;
		return this;
	}

	/**
	 * @param {FUChatData} data
	 * @returns {FUChatBuilder}
	 */
	withData(data) {
		this.#renderData = data.sections;
		this.#postRenderActions = data.postRenderActions;
		return this;
	}

	withFlavor(flavor) {
		this.#flavor = flavor;
		return this;
	}

	/**
	 * @desc Renders the chat message.
	 * @returns {Promise<void>}
	 */
	async create() {
		const actor = this.#actor;
		const flags = this.#flags;
		const item = this.#item;

		/**
		 * @type {CheckSection[]}
		 */
		const allSections = [];
		for (let value of this.#renderData) {
			value = await (value instanceof Function ? value() : value);
			if (value) {
				allSections.push(value);
			}
		}

		const partitionedSections = allSections.reduce(
			(agg, curr) => {
				if (Number.isNaN(curr.order)) {
					agg.flavor.push(curr);
				} else {
					agg.body.push(curr);
				}
				return agg;
			},
			{ flavor: [], body: [] },
		);

		/**
		 * @type {CheckSection[]}
		 */
		const flavorSections = partitionedSections.flavor;
		/**
		 * @type {CheckSection[]}
		 */
		const bodySections = partitionedSections.body;
		bodySections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

		// Gather flavor text
		let flavor;
		if (flavorSections.length) {
			flavor = '';
			for (let flavorSection of flavorSections) {
				if (flavorSection.content) {
					flavor = flavor + flavorSection.content;
				} else {
					flavor = flavor + (await foundry.applications.handlebars.renderTemplate(flavorSection.partial, flavorSection.data));
				}
			}
		}
		// TODO: Maybe prioritize?
		// If no flavor text was provided...
		if (!flavor?.trim()) {
			if (this.#flavor) {
				flavor = this.#flavor;
			} else {
				flavor = item
					? await FoundryUtils.renderTemplate('chat/chat-check-flavor-item-v2', {
							item: item,
						})
					: '';
			}
		}

		// Resolve speaker
		let speaker = ChatMessage.getSpeaker({ actor });
		if (speaker.scene && speaker.token) {
			const token = game.scenes.get(speaker.scene)?.tokens?.get(speaker.token);
			if (token) {
				speaker = ChatMessage.getSpeaker({ token });
			}
		}

		// Prepare data
		const chatMessage = {
			flavor: flavor,
			content: await FoundryUtils.renderTemplate('chat/partials/chat-common-sections', { sections: bodySections }),
			speaker: speaker,
			flags: flags,
		};
		const options = {};

		// OPTION: Roll data
		if (this.#rolls) {
			chatMessage.rolls = this.#rolls;
			options.rollMode = 'roll';
		}

		// Render to chat
		await ChatMessage.create(chatMessage, options);

		// Execute post-render actions
		for (const promise of this.#postRenderActions) {
			await promise();
		}
	}
}
