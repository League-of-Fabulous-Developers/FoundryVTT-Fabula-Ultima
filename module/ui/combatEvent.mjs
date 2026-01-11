/**
 * @description Dispatched by the combat during its lifetime
 * @property {FUCombatEventType} type The type of event
 * @property {Number} round The round the event is taking place in
 * @property {FUCombatant} combatant The current combatant taking a turn, which can be null.
 * @property {FUActor|*} actor The actor involved in the event, which can be null.
 * @property {Token|*} token The token of the combatant taking a turn, which can be null.
 * @property {FUCombatant[]} combatants The actors involved in the combat
 * @property {FUActor[]} actors The actors involved in the combat
 * @remarks Depending on the {@linkcode type} of the event, some properties will be assigned and others will not.
 * Combat and round events will include all combatants, whereas turn events are relegated to the single combatant.
 */
export class CombatEvent {
	constructor(type, round, combatants) {
		this.type = type;
		this.round = round;
		this.combatants = combatants;
	}

	forCombatant(combatant) {
		this.combatant = combatant;
		return this;
	}

	/**
	 * @returns {TokenDocument}
	 */
	get token() {
		return this.combatant?.token;
	}

	/**
	 * @returns {FUActor}
	 */
	get actor() {
		return this.combatant?.actor;
	}

	/**
	 * @returns {FUActor[]}
	 */
	get actors() {
		return Array.from(this.combatants.filter((c) => !!c.actor).map((c) => c.actor));
	}

	/**
	 * @returns {boolean} True if this combat event has an actor
	 */
	get hasActor() {
		return !!this.combatant;
	}
}
