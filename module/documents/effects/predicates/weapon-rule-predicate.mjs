import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ChooseWeaponDialog } from '../../items/skill/choose-weapon-dialog.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { BasicItemDataModel } from '../../items/basic/basic-item-data-model.mjs';
import { WeaponDataModel } from '../../items/weapon/weapon-data-model.mjs';
import { CustomWeaponDataModel } from '../../items/customWeapon/custom-weapon-data-model.mjs';

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
			selector: new fields.StringField({
				initial: 'initial',
				blank: true,
				choices: Object.keys(FU.targetSelector),
			}),
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
		const selected = context.selectTargets(this.selector);
		if (selected.length === 0) {
			return false;
		}
		const character = selected[0];
		let attackItem;

		// TODO: Clean up logic
		// Resolve the item
		switch (context.eventType) {
			case FUHooks.ATTACK_EVENT:
				{
					/** @type AttackEvent **/
					const event = context.event;
					if (character.actor === event.source.actor) {
						/** @type FUItem **/
						attackItem = event._item;
					}
				}
				break;

			case FUHooks.RESOLVE_CHECK_EVENT:
			case FUHooks.RENDER_CHECK_EVENT:
				{
					if (character.actor === context.event.source.actor) {
						/** @type FUItem **/
						attackItem = context.event.item;
					}
				}
				break;
		}

		// If not using the event attack item...
		if (!attackItem) {
			if (character.actor.type === 'character') {
				const mainHand = ChooseWeaponDialog.getWeapon(context.character.actor, 'mainHand');
				const offHand = ChooseWeaponDialog.getWeapon(context.character.actor, 'offHand');
				attackItem = mainHand ?? offHand;
			} else if (character.actor.type === 'npc') {
				/** @type {BasicItemDataModel[]} **/
				const attacks = character.actor.itemTypes.basic;
				attackItem = attacks[0];
			}
		}

		if (!attackItem) {
			return false;
		}

		if (attackItem.system instanceof WeaponDataModel || attackItem instanceof CustomWeaponDataModel) {
			/** @type {WeaponDataModel|CustomWeaponDataModel} **/
			const weaponData = attackItem.system;
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
		} else if (attackItem.system instanceof BasicItemDataModel) {
			/** @type {BasicItemDataModel} **/
			const attackData = attackItem.system;
			if (this.weaponType && this.weaponType !== attackData.type.value) {
				return false;
			}
		}
		return true;
	}
}
