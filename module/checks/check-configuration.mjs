import { SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CheckHooks } from './check-hooks.mjs';

const TARGETS = 'targets';
const TARGETED_DEFENSE = 'targetedDefense';
const DIFFICULTY = 'difficulty';
const DAMAGE = 'damage';
const HAS_DAMAGE = 'hasDamage';

/**
 *
 * @param difficulty
 * @return CheckCallback
 */
const initDifficulty = (difficulty) => (check) => difficulty > 0 && configure(check).setDifficulty(difficulty);

const HR_ZERO = 'hrZero';

/**
 * @param {boolean} hrZero
 * @return {CheckCallback}
 */
const initHrZero = (hrZero) => (check) => {
	hrZero && (check.additionalData[HR_ZERO] = true);
};

/**
 * @typedef BonusDamage
 * @property {string} label
 * @property {number} value
 */

/**
 * @typedef DamageData
 * @property {DamageType} type
 * @property {BonusDamage[]} modifiers
 * @property {number} [modifierTotal]
 * @property {number} [total]
 */

/**
 * @typedef TargetData
 * @property {string} name
 * @property {string} uuid
 * @property {string} link
 * @property {number} difficulty
 */

/**
 * @param {Check, CheckResultV2} check
 * @return {CheckConfigurer} check
 */
const configure = (check) => {
	return new CheckConfigurer(check);
};

class CheckConfigurer {
	#check;

	constructor(check) {
		this.#check = check;
	}

	/**
	 * @param {DamageType} type
	 * @param {number} baseDamage
	 * @return {CheckConfigurer}
	 */
	setDamage(type, baseDamage) {
		this.#check.additionalData[DAMAGE] = {
			modifiers: [{ label: 'FU.BaseDamage', value: baseDamage }],
			type,
		};
		return this;
	}

	/**
	 * @param {(damage: DamageData | null) => DamageData | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyDamage(callback) {
		const damage = this.#check.additionalData[DAMAGE] ?? null;
		this.#check.additionalData[DAMAGE] = callback(damage);
		return this;
	}

	/**
	 * @param {string} label
	 * @param {number} value
	 * @return CheckConfigurer
	 */
	addDamageBonus(label, value) {
		this.#check.additionalData[DAMAGE]?.modifiers.push({ label, value });
		return this;
	}

	/**
	 * @param {boolean} hrZero
	 * @return {CheckConfigurer}
	 */
	setHrZero(hrZero) {
		this.#check.additionalData[HR_ZERO] = hrZero;
		return this;
	}

	/**
	 * @param {(hrZero: boolean | null) => boolean | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyHrZero(callback) {
		const hrZero = this.#check.additionalData[HR_ZERO] ?? null;
		this.#check.additionalData[HR_ZERO] = callback(hrZero);
		return this;
	}

	/**
	 * @param {Defense} targetedDefense
	 * @return {CheckConfigurer}
	 */
	setTargetedDefense(targetedDefense) {
		this.#check.additionalData[TARGETED_DEFENSE] = targetedDefense;
		return this;
	}

	/**
	 * @param {(targetedDefense: Defense | null) => Defense | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyTargetedDefense(callback) {
		const targetedDefense = this.#check.additionalData[TARGETED_DEFENSE] ?? null;
		this.#check.additionalData[TARGETED_DEFENSE] = callback(targetedDefense);
		return this;
	}

	/**
	 * @param {TargetData[]} targets
	 * @return {CheckConfigurer}
	 */
	setTargets(targets) {
		this.#check.additionalData[TARGETS] = [...targets];
		return this;
	}

	/**
	 * @param {(targets: TargetData[] | null) => TargetData[] | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyTargets(callback) {
		const targets = this.#check.additionalData[TARGETS] ?? null;
		this.#check.additionalData[TARGETS] = callback(targets);
		return this;
	}

	/**
	 * @param {number} difficulty
	 * @return {CheckConfigurer}
	 */
	setDifficulty(difficulty) {
		this.#check.additionalData[DIFFICULTY] = difficulty;
		return this;
	}

	/**
	 * @param {(difficulty: number | null) => number | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyDifficulty(callback) {
		const difficulty = this.#check.additionalData[DIFFICULTY] ?? null;
		this.#check.additionalData[DIFFICULTY] = callback(difficulty);
		return this;
	}
}

/**
 * @param {Check, CheckResultV2, ChatMessage} check
 * @return {CheckInspector}
 */
const inspect = (check) => {
	if (check instanceof ChatMessage) {
		check = check.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
	}
	return new CheckInspector(check);
};

class CheckInspector {
	#check;

	constructor(check) {
		this.#check = check;
	}

	/**
	 * @return {DamageData|null}
	 */
	getDamage() {
		return (this.#check.additionalData[HAS_DAMAGE] == null || this.#check.additionalData[HAS_DAMAGE] === true) && this.#check.additionalData[DAMAGE] != null ? foundry.utils.duplicate(this.#check.additionalData[DAMAGE]) : null;
	}

	/**
	 * @return {boolean|null}
	 */
	getHrZero() {
		return this.#check.additionalData[HR_ZERO] ?? null;
	}

	/**
	 * @return {Defense|null}
	 */
	getTargetedDefense() {
		return this.#check.additionalData[TARGETED_DEFENSE] ?? null;
	}

	/**
	 * @return {number|null}
	 */
	getDifficulty() {
		return this.#check.additionalData[DIFFICULTY] ?? null;
	}

	/**
	 * @return {TargetData[]|null}
	 */
	getTargets() {
		return this.#check.additionalData[TARGETS] ? foundry.utils.duplicate(this.#check.additionalData[TARGETS]) : null;
	}
}

/**
 * @param {CheckResultV2} check
 * @param {FUActor} actor
 */
const registerMetaCurrencyExpenditure = (check, actor) => {
	const randomId = foundry.utils.randomID();
	check.additionalData.triggerMetaCurrencyExpenditure = randomId;
	let hookId;
	/**
	 * @type RenderCheckHook
	 */
	const spendMetaCurrency = (sections, check, actor) => {
		if (check.additionalData.triggerMetaCurrencyExpenditure === randomId) {
			delete check.additionalData.triggerMetaCurrencyExpenditure;
			Hooks.off(CheckHooks.renderCheck, hookId);
			sections.push(async () => {
				const success = await actor.spendMetaCurrency(true);
				if (!success) {
					throw new Error('not enough meta currency');
				}
			});
		}
	};

	hookId = Hooks.on(CheckHooks.renderCheck, spendMetaCurrency);
};

export const CheckConfiguration = Object.freeze({
	configure,
	inspect,
	initHrZero,
	initDifficulty,
	registerMetaCurrencyExpenditure,
});
