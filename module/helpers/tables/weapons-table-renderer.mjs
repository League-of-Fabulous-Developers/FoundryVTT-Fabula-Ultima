import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';
import { TextEditor } from '../text-editor.mjs';

const customWeaponFormTranslations = {
	primaryForm: 'FU.CustomWeaponFormPrimary',
	secondaryForm: 'FU.CustomWeaponFormSecondary',
};

const weaponDescriptionRenderer = CommonDescriptions.descriptionWithTags((item) => {
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
});

const customWeaponDescriptionRenderer = CommonDescriptions.descriptionWithTechnospheres(
	(item) => ({ slotted: item.system.slotted, totalSlots: item.system.slotCount, maxMnemospheres: item.system.mnemosphereSlots }),
	(item) => {
		const tags = [];
		tags.push({
			tag: 'FU.Cost',
			separator: ':',
			value: item.system.cost,
		});
		if (item.system.quality) {
			tags.push({
				tag: 'FU.Quality',
				separator: ':',
				value: item.system.quality,
			});
		}
		return tags;
	},
);

const renderDescriptionByType = {
	weapon: weaponDescriptionRenderer,
	customWeapon: customWeaponDescriptionRenderer,
};

export class WeaponsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'weapons-table',
		getItems: WeaponsTableRenderer.#getItems,
		renderDescription: WeaponsTableRenderer.#renderDescription,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Weapons', cssClass: WeaponsTableRenderer.#getCssClasses, renderCaption: WeaponsTableRenderer.#renderCaption }),
			check: CommonColumns.checkColumn({ columnLabel: 'FU.Attack', getCheck: WeaponsTableRenderer.#getCheck }),
			damage: CommonColumns.damageColumn({ columnLabel: 'FU.Damage', getDamage: WeaponsTableRenderer.#getDamage }),
			equipStatus: {
				renderHeader: () => game.i18n.localize('FU.EquipStatus'),
				renderCell: WeaponsTableRenderer.#renderEquipStatus,
			},
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Weapon', type: 'weapon,customWeapon' }, { disableEdit: WeaponsTableRenderer.#isUnarmedAttack, disableMenu: WeaponsTableRenderer.#isUnarmedAttack }),
		},
		actions: {
			technosphere: WeaponsTableRenderer.#technosphereAction,
		},
		dragDrop: [
			{
				dropSelector: '.description-with-slots__slots-container .description-with-slots__slot--empty',
				permissions: {
					drop: WeaponsTableRenderer.#canDrop,
				},
				callbacks: {
					drop: WeaponsTableRenderer.#onDrop,
				},
			},
		],
	};

	static #getItems(actor) {
		const weapons = [];
		for (const item of actor.allItems()) {
			if (item.type in FU.weaponItemTypes) {
				weapons.push(item);
			}
		}
		return weapons;
	}

	static #renderDescription(item) {
		const descriptionRenderer = renderDescriptionByType[item.type];
		if (descriptionRenderer) {
			return descriptionRenderer(item);
		} else {
			console.warn('Item type is missing description renderer', item.type);
			return '';
		}
	}

	static #renderCaption(item) {
		let data;
		if (item.type === 'weapon') {
			data = {
				category: FU.weaponCategories[item.system.category.value],
				hands: FU.handedness[item.system.hands.value],
				type: FU.weaponTypes[item.system.type.value],
				defense: FU.defenses[item.system.defense].abbr,
			};
		}

		if (item.type === 'customWeapon') {
			data = {
				category: FU.weaponCategories[item.system.category],
				hands: 'TYPES.Item.customWeapon',
				type: FU.weaponTypes[item.system.type],
				defense: FU.defenses[item.system.defense].abbr,
			};
			if (item.system.isTransforming) {
				const activeForm = item.system.activeForm;
				data.hands = item.system[activeForm].name || customWeaponFormTranslations[activeForm];
			}
		}

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/caption/caption-weapon'), data);
	}

	static #getCheck(item) {
		if (item.type === 'customWeapon') {
			return {
				primary: item.system.attributes.primary,
				secondary: item.system.attributes.secondary,
				bonus: item.system.accuracy,
			};
		} else {
			return {
				primary: item.system.attributes.primary.value,
				secondary: item.system.attributes.secondary.value,
				bonus: item.system.accuracy.value,
			};
		}
	}

	static #getDamage(item) {
		if (item.type === 'customWeapon') {
			return {
				damage: item.system.damage.value,
				type: item.system.damage.type,
				bonus: false,
			};
		} else {
			return {
				damage: item.system.damage.value,
				type: item.system.damageType.value,
				hrZero: item.system.rollInfo.useWeapon.hrZero.value,
			};
		}
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

		if (item.type === 'customWeapon' && item.system.isTransforming) {
			const activeForm = item.system.activeForm;
			const newForm = activeForm === 'primaryForm' ? 'secondaryForm' : 'primaryForm';
			data.transform = {
				action: 'switchForm',
				tooltip: game.i18n.format('FU.CustomWeaponFormSwitchTooltip', { newForm: item.system[newForm].name || game.i18n.localize(customWeaponFormTranslations[newForm]) }),
			};
		}

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equip-status'), data);
	}

	static #isUnarmedAttack(item) {
		return item.system.fuid === FU.unarmedStrike;
	}

	static #getCssClasses(item) {
		const classes = [];

		if (item.type === 'weapon' && item.system.isMartial.value) {
			classes.push('after-martial-item-icon');
		}

		if (item.type === 'customWeapon' && item.system.isMartial) {
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

	static async #technosphereAction(event, target) {
		const item = await fromUuid(target.closest('[data-uuid]')?.dataset?.uuid);
		const technosphere = await fromUuid(target.closest('[data-technosphere-uuid]')?.dataset?.technosphereUuid);

		if (event.button === 0) {
			if (technosphere) {
				return technosphere.sheet.render({ force: true });
			}
		}

		if (event.button === 2) {
			if (item && technosphere) {
				return item.system.removeTechnosphere(technosphere);
			}
		}
	}

	static #canDrop() {
		return this.application.isEditable;
	}

	static async #onDrop(dragEvent) {
		const eventData = TextEditor.getDragEventData(dragEvent);

		if (eventData.type === 'Item') {
			dragEvent.preventDefault();
			dragEvent.stopPropagation();

			const item = await fromUuid(dragEvent.target.closest('[data-uuid]')?.dataset?.uuid);
			if (item && item.type === 'customWeapon') {
				const droppedItem = await fromUuid(eventData.uuid);
				return item.system.slotTechnosphere(droppedItem);
			}
		}
	}
}
