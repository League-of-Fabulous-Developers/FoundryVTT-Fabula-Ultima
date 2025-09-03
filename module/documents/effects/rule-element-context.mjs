import { InlineSourceInfo } from '../../helpers/inline-helper.mjs';

/**
 * @template T
 * @property {FUActiveEffect} effect
 * @property {String} type The event type
 * @property {EventCharacter} character The character the rule element is being evaluated on.
 * @property {InlineSourceInfo} sourceInfo
 * @property {FUItem|null} item The item the rule element could be on.
 * @property {EventCharacter} source The source character of the event.
 * @property {EventCharacter[]} targets The targets of the event.
 * @property {EventCharacter[]} scene.characters All the characters involved in the scene.
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
	 * @param {FUTargetSelectorKey} selector
	 * @returns {EventCharacter[]}
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
