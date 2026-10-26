import { InlineSourceInfo } from '../../helpers/inline-helper.mjs';
import { ExpressionContext } from '../../expressions/expressions.mjs';

/**
 * @template T
 * @property {String} type The event type
 * @property {FUActiveEffect} effect
 * @property {T} event
 * @property {CharacterInfo} character The character the rule element is being evaluated on.
 * @property {FUItem|null} item The item the rule element could be on.
 * @property {CharacterInfo} source The source character of the event.
 * @property {CharacterInfo[]} targets The targets of the event.
 * @property {CharacterInfo[]} sceneCharacters All the characters involved in the scene.
 * @property {InlineSourceInfo} sourceInfo
 * @property {String} origin An unique identifier for the rule element
 * @property {String} label A human-readable identifier for the rule element
 * @property {Object} data whatever event specific data is passed into the context
 */
export class RuleElementContext {
	#type;
	#effect;
	#event;
	#character;
	#item;
	#source;
	#targets;
	#sceneCharacters;
	#sourceInfo;
	#origin;
	#label;
	#data;

	constructor(context = {}) {
		const { type, effect, character, item, source, targets, sceneCharacters, event, data, ...rest } = context;
		this.#type = type;
		this.#effect = effect;
		this.#event = event;
		this.#character = character;
		this.#item = item;
		this.#source = source;
		this.#targets = targets;
		this.#sceneCharacters = sceneCharacters;
		this.#sourceInfo = InlineSourceInfo.fromInstance(character.actor, item, effect.name);
		this.#origin = effect.id;
		this.#label = effect.name;
		this.#data = Object.assign(data, rest);
	}

	get type() {
		return this.#type;
	}

	get effect() {
		return this.#effect;
	}

	get character() {
		return this.#character;
	}

	get sourceInfo() {
		return this.#sourceInfo;
	}

	get item() {
		return this.#item;
	}

	get source() {
		return this.#source;
	}

	get targets() {
		return this.#targets;
	}

	get sceneCharacters() {
		return this.#sceneCharacters;
	}

	get origin() {
		return this.#origin;
	}

	get label() {
		return this.#label;
	}

	get event() {
		return this.#event;
	}

	get data() {
		return this.#data;
	}

	/**
	 * @returns {FUActor[]}
	 */
	get targetActors() {
		return this.targets.map((target) => target.actor);
	}

	/**
	 * @returns {String} The event type, found in {@linkcode FUHooks}
	 */
	get eventType() {
		return this.type;
	}

	/**
	 * @returns {FUItem}
	 */
	getItem() {
		if (this.event.item) {
			return this.event.item;
		}
		return this.item;
	}

	/**
	 * @param {String} id An identifier to match against.
	 * @return {Boolean}
	 */
	matchesItem(id) {
		let item;

		// Prioritize comparing against the event item
		if (this.event.item) {
			item = this.event.item;
		} else {
			item = this.item;
		}

		// If there's an item
		if (item) {
			// If we have provided an identifier, check against it
			if (id) {
				if (item.system.fuid === id) {
					return true;
				}
				if (item.name.toLowerCase() === id.toLowerCase()) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * @return {Boolean} True if the item in the event is that of the item the rule element is attached to.
	 */
	isLocalItem() {
		if (!this.item || !this.sourceInfo?.itemUuid) {
			return false;
		}

		if (this.event.sourceInfo) {
			return this.event.sourceInfo.itemUuid === this.sourceInfo.itemUuid;
		}

		if (this.event.item) {
			return this.event.item.uuid === this.sourceInfo.itemUuid;
		}

		return false;
	}

	/**
	 * @param {FUTargetSelectorKey} selector
	 * @returns {CharacterInfo[]}
	 */
	selectTargets(selector) {
		switch (selector) {
			case 'source':
				return [this.source];
			case 'initial':
				return this.targets;
			case 'self':
				return [this.character];
			case 'scene':
				return this.sceneCharacters;
			case 'none':
				return [];
		}
		return null;
	}

	/**
	 * @param {CharacterInfo[]}  selected
	 * @returns {ExpressionContext}
	 */
	getExpressionContext(selected) {
		const targets = selected.map((t) => t.actor);
		return ExpressionContext.fromSourceInfo(this.sourceInfo, targets);
	}
}
