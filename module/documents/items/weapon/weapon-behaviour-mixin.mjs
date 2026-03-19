/**
 * @typedef WeaponAccuracy
 * @property {Attribute} primary
 * @property {Attribute} secondary
 * @property {Defense} defense
 * @property {Number} bonus
 */

/**
 * @typedef WeaponTraits
 * @property {WeaponType} [weaponType]
 * @property {WeaponCategory} [weaponCategory]
 * @property {Handedness} handedness
 */

/**
 * @typedef WeaponData
 * @property {WeaponType} type
 * @property {WeaponCategory} category
 * @property {Handedness} handedness
 * @property {WeaponAccuracy} accuracy
 * @property {DamageType} damage.type
 * @property {Number|String} damage.value
 * @property {Set<String>} traits

/**
 * @param BaseClass
 * @return {typeof FUItemBehaviourMixin}
 */
export function WeaponBehaviourMixin(BaseClass) {
	return class FUWeaponBehaviourMixin extends BaseClass {
		static defineSchema() {
			return Object.assign(super.defineSchema(), {});
		}
	};
}
