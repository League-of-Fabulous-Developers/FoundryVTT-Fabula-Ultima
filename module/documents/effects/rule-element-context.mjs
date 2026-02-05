import { InlineSourceInfo } from '../../helpers/inline-helper.mjs';
import { ExpressionContext } from '../../expressions/expressions.mjs';

/**
 * @template T
 * @property {FUActiveEffect} effect
 * @property {String} type The event type
 * @property {CharacterInfo} character The character the rule element is being evaluated on.
 * @property {InlineSourceInfo} sourceInfo
 * @property {CheckResultV2|null} check Some events may have check information.
 * @property {CheckConfigurer|null} config Configuration for a check, available in events involving the checks pipeline.
 * @property {CheckRenderData} renderData Used for rendering chat messages.
 * @property {FUItem|null} item The item the rule element could be on.
 * @property {CharacterInfo} source The source character of the event.
 * @property {CharacterInfo[]} targets The targets of the event.
 * @property {CharacterInfo[]} scene.characters All the characters involved in the scene.
 * @property {String} origin An unique identifier for the rule element
 * @property {String} label A human-readable identifier for the rule element
 * @property {T} event
 */
export class RuleElementContext {
	constructor(data = {}) {
		Object.assign(this, data);
		this.sourceInfo = InlineSourceInfo.fromInstance(data.character.actor, data.item, data.effect.name);
		this.origin = data.effect.id;
		this.label = data.effect.name;
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
	 * @param {String} id
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
				if (item.name === id) {
					return true;
				}
			}
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
				return this.scene.characters;
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
