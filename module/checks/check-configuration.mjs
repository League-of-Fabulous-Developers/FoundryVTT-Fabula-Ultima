import { SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { Flags } from '../helpers/flags.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { Traits } from '../pipelines/traits.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { PlayerListEnhancements } from '../helpers/player-list-enhancements.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { DamageData } from './damage-data.mjs';

// Data keys
const TARGETS = 'targets';
const TARGETED_DEFENSE = 'targetedDefense';
const DIFFICULTY = 'difficulty';
const DAMAGE = 'damage';
const RESOURCE = 'resource';
const EFFECTS = 'effects';
const TRAITS = 'traits';
const WEAPON_TRAITS = 'weaponTraits';
const LABEL_KEY = 'label';
const TARGETED_ACTIONS = 'targetedActions';

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
 * @typedef WeaponTraits
 * @property {WeaponType} [weaponType]
 * @property {WeaponCategory} [weaponCategory]
 * @property {Handedness} handedness
 */

/**
 * @description Given a {@link CheckResultV2} object, provides additional information from it
 * @remarks Provides read-only access, to be used after {@linkcode CheckConfigurer}
 */
class CheckInspector {
	/**
	 * @type CheckResultV2
	 */
	#check;

	constructor(check) {
		this.#check = check;
	}

	/**
	 * @return {CheckV2|CheckResultV2}
	 */
	get check() {
		return this.#check;
	}

	/**
	 * @return {CheckV2|CheckResultV2}
	 */
	getCheck() {
		return this.#check;
	}

	/**
	 * @return {DamageData|null}
	 * @remarks Embeds the high roll into the data
	 */
	getDamage() {
		const data = this.#check.additionalData[DAMAGE];
		if (data) {
			data.hr = this.getHighRoll();
			data.hrZero = this.getHrZero();
			if (this.hasTrait(Traits.Base)) {
				data.base = true;
			}
			if (data instanceof DamageData) {
				return data;
			}
			return new DamageData(foundry.utils.duplicate(data));
		}
		return null;
	}

	/**
	 * @returns {Boolean}
	 */
	get hasDamage() {
		return this.check.additionalData[DAMAGE] !== undefined;
	}

	/**
	 * @returns {DamageData}
	 */
	get damage() {
		return this.check.additionalData[DAMAGE];
	}

	/**
	 * @returns {UpdateResourceData}
	 */
	getResource() {
		const data = this.#check.additionalData[RESOURCE];
		if (data) {
			return data;
		}
		return null;
	}

	/**
	 * @returns {ApplyEffectData|null}
	 */
	getEffects() {
		const data = this.#check.additionalData[EFFECTS];
		if (data) {
			return data;
		}
		return null;
	}

	/**
	 * @return {boolean|null}
	 */
	getHrZero() {
		return this.#check.additionalData[HR_ZERO] ?? null;
	}

	/**
	 * @return {Number}
	 */
	getHighRoll() {
		return Math.max(this.#check.primary.result, this.#check.secondary.result);
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
	 * @return {String[]}
	 */
	getTraits() {
		return this.#check.additionalData[TRAITS] ?? [];
	}

	/**
	 * @param trait
	 * @returns {Boolean}
	 */
	hasTrait(trait) {
		return this.getTraits().includes(trait);
	}

	/**
	 * @return WeaponTraits
	 */
	getWeaponTraits() {
		return this.#check.additionalData[WEAPON_TRAITS] ?? {};
	}

	/**
	 * @return {TargetData[]}
	 */
	getTargets() {
		return this.#check.additionalData[TARGETS] ? foundry.utils.duplicate(this.#check.additionalData[TARGETS]) : null;
	}

	/**
	 * @return {TargetData[]}
	 */
	getTargetsOrDefault() {
		return this.getTargets() || [];
	}

	/**
	 * @returns {Boolean}
	 */
	isCritical() {
		return this.getCheck().critical;
	}

	/**
	 * @returns {Boolean}
	 */
	isFumble() {
		return this.getCheck().fumble;
	}

	/**
	 * @returns {String|undefined} Optional label for this check
	 */
	getLabel() {
		return this.#check.additionalData[LABEL_KEY];
	}

	/**
	 *@returns {TargetAction[]}
	 */
	getTargetedActions() {
		return this.#check.additionalData[TARGETED_ACTIONS] ?? [];
	}
}

/**
 * @desc Provides an interface for configuring a check as it is processed
 */
class CheckConfigurer extends CheckInspector {
	/**
	 * @param {Attribute} primary
	 * @param {Attribute} secondary
	 */
	setAttributes(primary, secondary) {
		this.check.primary = primary;
		this.check.secondary = secondary;
	}

	/**
	 * @param {DamageType} type
	 * @param {number} baseDamage
	 * @return {CheckConfigurer}
	 */
	setDamage(type, baseDamage) {
		const data = new DamageData();
		data.addModifier('FU.BaseDamage', baseDamage, [type]);
		data.type = type;
		this.check.additionalData[DAMAGE] = data;
		return this;
	}

	/**
	 * @param {FUResourceType} type
	 * @param {String} amount
	 * @return {CheckConfigurer}
	 */
	setResource(type, amount) {
		this.check.additionalData[RESOURCE] = {
			type: type,
			amount: amount,
		};
		return this;
	}

	/**
	 * @param {...(string|string[])} effects
	 * @return {CheckConfigurer}
	 */
	addEffects(...effects) {
		if (this.getEffects() === null) {
			this.check.additionalData[EFFECTS] = {
				entries: [],
			};
		}

		const entries = this.check.additionalData[EFFECTS].entries;

		for (const effect of effects) {
			if (Array.isArray(effect)) {
				entries.push(...effect);
			} else {
				entries.push(effect);
			}
		}

		return this;
	}

	/**
	 * @param {String[]|String} traits
	 * @returns {CheckConfigurer}
	 */
	addTraits(...traits) {
		if (!this.check.additionalData[TRAITS]) {
			this.check.additionalData[TRAITS] = [];
		}
		traits.forEach((t) => this.check.additionalData[TRAITS].push(t.toLowerCase()));
		return this;
	}

	/**
	 * @param {Set<String>} traits
	 * @returns {CheckConfigurer}
	 * @remarks In the item's data model they are serialized in title case
	 */
	addTraitsFromItemModel(traits) {
		this.addTraits(...Array.from(traits, StringUtils.titleToKebab));
		return this;
	}

	/**
	 * @param {WeaponDataModel} weapon
	 * @returns {CheckConfigurer}
	 */
	addWeaponAccuracy(weapon) {
		const baseAccuracy = weapon.accuracy.value;
		if (baseAccuracy) {
			this.addModifier('FU.AccuracyCheckBaseAccuracy', baseAccuracy);
		}
		return this;
	}

	/**
	 * @param {WeaponTraits} traits
	 * @return {CheckConfigurer}
	 */
	setWeaponTraits(traits) {
		this.check.additionalData[WEAPON_TRAITS] = {
			weaponType: traits.weaponType,
			weaponCategory: traits.weaponCategory,
			handedness: traits.handedness,
		};
		// Also add them to the flattened traits array
		const flatTraits = Object.values(traits).filter((t) => !!t);
		this.addTraits(...flatTraits);
		return this;
	}

	/**
	 * @description A modifier to the check (accuracy)
	 * @param {String} label
	 * @param {Number} value
	 * @return {CheckConfigurer}
	 */
	addModifier(label, value) {
		this.check.modifiers.push({
			label: label,
			value: value,
		});
		return this;
	}

	/**
	 * @param {(damage: DamageData | null) => DamageData | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyDamage(callback) {
		const damage = this.getDamage();
		if (damage) {
			this.check.additionalData[DAMAGE] = callback(damage);
		}
		return this;
	}

	/**
	 * @param {string} label
	 * @param {number} value
	 * @return CheckConfigurer
	 */
	addDamageBonus(label, value) {
		this.check.additionalData[DAMAGE]?.addModifier(label, value);
		return this;
	}

	/**
	 * @param {string} label
	 * @param {number} path
	 * @return CheckConfigurer
	 */
	addDamageBonusIfDefined(label, value) {
		if (value) {
			return this.addDamageBonus(label, value);
		}
		return this;
	}

	/**
	 * @param {String} extra
	 * @return {CheckConfigurer}
	 */
	setExtraDamage(extra) {
		this.damage.extra = extra;
		return this;
	}

	/**
	 * @param {boolean} hrZero
	 * @return {CheckConfigurer}
	 */
	setHrZero(hrZero) {
		this.check.additionalData[HR_ZERO] = hrZero;
		return this;
	}

	/**
	 * @param {(hrZero: boolean | null) => boolean | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyHrZero(callback) {
		const hrZero = this.check.additionalData[HR_ZERO] ?? null;
		this.check.additionalData[HR_ZERO] = callback(hrZero);
		return this;
	}

	/**
	 * @param {Defense} targetedDefense
	 * @return {CheckConfigurer}
	 */
	setTargetedDefense(targetedDefense) {
		this.check.additionalData[TARGETED_DEFENSE] = targetedDefense;
		this.updateTargetResults();
		return this;
	}

	/**
	 * @param {(targetedDefense: Defense | null) => Defense | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyTargetedDefense(callback) {
		const targetedDefense = this.check.additionalData[TARGETED_DEFENSE] ?? null;
		return this.setTargetedDefense(callback(targetedDefense));
	}

	/**
	 * @param {TargetData[]} targets
	 * @return {CheckConfigurer}
	 */
	setTargets(targets) {
		this.check.additionalData[TARGETS] = [...targets];
		this.updateTargetResults();
		return this;
	}

	/**
	 * @remarks Invoked whenever targets or targeted defense change
	 */
	updateTargetResults() {
		const targets = this.check.additionalData[TARGETS];
		if (targets?.length) {
			if (!this.check.result) {
				return;
			}
			const targetedDefense = this.getTargetedDefense();
			targets.forEach((target) => {
				const difficulty = target[targetedDefense];
				let targetResult;
				if (this.check.critical) {
					targetResult = 'hit';
				} else if (this.check.fumble) {
					targetResult = 'miss';
				} else {
					targetResult = this.check.result >= difficulty ? 'hit' : 'miss';
				}
				target.result = targetResult;
			});
		}
	}

	/**
	 * @description Assign actors currently targeted by the users
	 * @return {CheckConfigurer}
	 */
	setDefaultTargets() {
		return this.setTargets(
			[...game.user.targets]
				.filter((token) => !!token.actor)
				.map((token) => {
					if (!token.actor.isCharacterType) {
						ui.notifications.error('FU.DialogInvalidTarget', { localize: true });
						throw Error('Only character types can be targeted');
					}
					return Targeting.constructData(token.actor);
				}),
		);
	}

	/**
	 * @param {(targets: TargetData[] | null) => TargetData[] | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyTargets(callback) {
		const targets = this.check.additionalData[TARGETS] ?? null;
		return this.setTargets(callback(targets));
	}

	/**
	 * @param {number} difficulty
	 * @return {CheckConfigurer}
	 */
	setDifficulty(difficulty) {
		this.check.additionalData[DIFFICULTY] = difficulty;
		return this;
	}

	/**
	 * @param {(difficulty: number | null) => number | null} callback
	 * @return {CheckConfigurer}
	 */
	modifyDifficulty(callback) {
		const difficulty = this.check.additionalData[DIFFICULTY] ?? null;
		this.check.additionalData[DIFFICULTY] = callback(difficulty);
		return this;
	}

	/**
	 * @description Handles specific overrides on the actor
	 * @param {FUActor} actor
	 * @param {FU.damageOverrideScope} scope
	 * @return {CheckConfigurer}
	 * @remarks Only really executed on PCs
	 */
	setDamageOverride(actor, scope) {
		// Potential override to damage type
		if (actor.system instanceof CharacterDataModel) {
			/** @type DamageTypeOverrideDataModel **/
			let scopeField;
			switch (scope) {
				case 'attack':
					scopeField = actor.system.overrides.damageType.attack;
					break;
				case 'skill':
					scopeField = actor.system.overrides.damageType.skill;
					break;
				case 'spell':
					scopeField = actor.system.overrides.damageType.spell;
					break;
				default:
					break;
			}
			let resolvedType = scopeField.resolve();
			if (!resolvedType) {
				resolvedType = actor.system.overrides.damageType.all.resolve();
			}
			if (resolvedType) {
				this.setDamageType(resolvedType);
			}
		}
		return this;
	}

	/**
	 * @param {DamageType} type
	 */
	setDamageType(type) {
		this.check.additionalData[DAMAGE].type = type;
	}

	/**
	 * @desc Set a custom label for the check
	 * @param {String} label
	 */
	setLabel(label) {
		this.check.additionalData[LABEL_KEY] = label;
	}

	/**
	 * @param {TargetAction} action
	 * @remarks Will reject adding duplicates.
	 */
	addTargetedAction(action) {
		if (!this.check.additionalData[TARGETED_ACTIONS]) {
			this.check.additionalData[TARGETED_ACTIONS] = [];
		}
		this.check.additionalData[TARGETED_ACTIONS].push(action);
	}
}

/**
 * @param {CheckResultV2} check
 */
const registerMetaCurrencyExpenditure = (check) => {
	if (!game.settings.get(SYSTEM, SETTINGS.metaCurrencyAutomation)) {
		return;
	}
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
				const success = await PlayerListEnhancements.spendMetaCurrency(actor, true);
				if (!success) {
					throw new Error('not enough meta currency');
				}
			});
		}
	};

	hookId = Hooks.on(CheckHooks.renderCheck, spendMetaCurrency);
};

/**
 * @param {CheckV2, CheckResultV2} check
 * @return {CheckConfigurer} check
 */
const configure = (check) => {
	return new CheckConfigurer(check);
};

/**
 * @param {CheckV2, CheckResultV2, ChatMessage} check
 * @return {CheckInspector}
 */
const inspect = (check) => {
	if (check instanceof ChatMessage) {
		check = check.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
	}
	return new CheckInspector(check);
};

export const CheckConfiguration = Object.freeze({
	configure,
	inspect,
	initHrZero,
	initDifficulty,
	registerMetaCurrencyExpenditure,
});
