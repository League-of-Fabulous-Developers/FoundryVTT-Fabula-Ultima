import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ChooseWeaponDialog } from '../../items/skill/choose-weapon-dialog.mjs';

const fields = foundry.data.fields;

/**
 * @property {boolean} martial
 * @property {WeaponType} weaponType
 * @property {Set<WeaponCategory>} categories
 * @property {Handedness} handedness
 */
export class WeaponRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'weaponRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			martial: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.booleanOption) }),
			handedness: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.handedness) }),
			weaponType: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.weaponTypes) }),
			categories: new fields.SetField(new fields.StringField()),
		});
	}

	static get localization() {
		return 'FU.RulePredicateWeapon';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/weapon-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		if (context.character.actor.type === 'character') {
			const mainHand = ChooseWeaponDialog.getWeapon(context.character.actor, 'mainHand');
			const offHand = ChooseWeaponDialog.getWeapon(context.character.actor, 'offHand');
			const weaponItem = mainHand ?? offHand;
			if (weaponItem) {
				/** @type {WeaponDataModel|CustomWeaponDataModel} **/
				const weaponData = weaponItem.system;
				if (this.categories.size > 0) {
					if (!this.categories.has(weaponData.category.value)) {
						return false;
					}
				}
				if (this.weaponType && this.weaponType !== weaponData.type.value) {
					return false;
				}
				if (this.handedness && this.handedness !== weaponData.hands.value) {
					return false;
				}
				if (this.martial && this.martial !== weaponData.isMartial.value) {
					return false;
				}
			}
		}
		return true;
	}
}
