import FoundryUtils from './foundry-utils.mjs';

export class SectionChatBuilder {
	/**
	 * @type {CheckRenderData}
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

	constructor(actor, item) {
		this.#actor = actor;
		this.#item = item;
		this.#flags = {};
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

		// Flavor text
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
		if (!flavor?.trim()) {
			flavor = item
				? await FoundryUtils.renderTemplate('chat/chat-check-flavor-item-v2', {
						item: item,
					})
				: '';
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
		return void ChatMessage.create(chatMessage, options);
	}
}
