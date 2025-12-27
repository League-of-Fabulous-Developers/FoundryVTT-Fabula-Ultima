import { InlineSourceInfo } from '../../helpers/inline-helper.mjs';

/**
 * @template T
 * @property {FUActiveEffect} effect
 * @property {String} type The event type
 * @property {CharacterInfo} character The character the rule element is being evaluated on.
 * @property {InlineSourceInfo} sourceInfo
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
		// If there's an item
		if (this.item) {
			// If we have provided an identifier, check against it
			if (id) {
				if (this.item.system.fuid === id) {
					return true;
				}
				if (this.item.name === id) {
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
		}
		return null;
	}
}
