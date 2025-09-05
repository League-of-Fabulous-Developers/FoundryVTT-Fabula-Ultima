import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';

export class WeaponsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'weapons-table',
		getItems: (d) => d.itemTypes.weapon,
		renderDescription: CommonDescriptions.descriptionWithTags((item) => {
			const tags = [];
			tags.push({
				tag: 'FU.Cost',
				separator: ':',
				value: item.system.cost.value,
			});
			if (item.system.quality.value) {
				tags.push({
					tag: 'FU.Quality',
					separator: ':',
					value: item.system.quality.value,
				});
			}
			return tags;
		}),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Weapons', cssClass: WeaponsTableRenderer.#getCssClasses, renderCaption: WeaponsTableRenderer.#renderCaption }),
			check: CommonColumns.checkColumn({ columnLabel: 'FU.Attack', getCheck: WeaponsTableRenderer.#getCheck }),
			damage: CommonColumns.damageColumn({ columnLabel: 'FU.Damage', getDamage: WeaponsTableRenderer.#getDamage }),
			equipStatus: {
				renderHeader: () => game.i18n.localize('FU.EquipStatus'),
				renderCell: WeaponsTableRenderer.#renderEquipStatus,
			},
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Weapon', type: 'weapon' }, { disableEdit: WeaponsTableRenderer.#isUnarmedAttack, disableMenu: WeaponsTableRenderer.#isUnarmedAttack }),
		},
	};

	static #renderCaption(item) {
		const data = {
			category: FU.weaponCategories[item.system.category.value],
			hands: FU.handedness[item.system.hands.value],
			type: FU.weaponTypes[item.system.type.value],
			defense: FU.defenses[item.system.defense].abbr,
		};

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/caption/caption-weapon'), data);
	}

	static #getCheck(item) {
		return {
			primary: item.system.attributes.primary.value,
			secondary: item.system.attributes.secondary.value,
			bonus: item.system.accuracy.value,
		};
	}

	static #getDamage(item) {
		return {
			damage: item.system.damage.value,
			type: item.system.damageType.value,
			hrZero: item.system.rollInfo.useWeapon.hrZero.value,
		};
	}

	static #renderEquipStatus(item) {
		const data = {
			action: 'equipWeapon',
			equipTooltip: 'FU.EquipWeapon',
			unequipTooltip: 'FU.UnequipWeapon',
			icons: {
				mainHand: 'ra ra-sword ra-1xh ra-flip-horizontal',
				offHand: 'ra ra-plain-dagger ra-1xh ra-rotate-180',
				bothHands: 'is-two-weapon equip ra-1xh',
				phantom: 'ra ra-daggers ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equip-status'), data);
	}

	static #isUnarmedAttack(item) {
		return item.system.fuid === FU.unarmedStrike;
	}

	static #getCssClasses(item) {
		const classes = [];

		if (item.system.isMartial.value) {
			classes.push('after-martial-item-icon');
		}

		if (item.actor.type === 'npc') {
			if (item.system.type.value === 'melee') {
				classes.push('before-melee-icon');
			} else {
				classes.push('before-ranged-icon');
			}
		}

		return classes.join(' ');
	}
}
