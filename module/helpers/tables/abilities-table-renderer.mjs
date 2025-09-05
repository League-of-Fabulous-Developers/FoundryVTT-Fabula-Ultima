import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';

export class AbilitiesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'abilities-table',
		getItems: (document) => document.itemTypes.miscAbility,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.OtherAction', headerSpan: 2, renderCaption: AbilitiesTableRenderer.#renderCaption, cssClass: (item) => (item.parent.type === 'npc' ? 'before-ability-icon' : '') }),
			combinedProgress: {
				hideHeader: true,
				renderCell: AbilitiesTableRenderer.#renderCombinedProgress,
			},
			controls: CommonColumns.itemControlsColumn({ type: 'miscAbility', label: 'TYPES.Item.miscAbility' }),
		},
	};

	static async #renderCaption(item) {
		const data = {
			FU,
		};

		if (item.system.hasRoll.value) {
			let mainWeapon;

			const mainHandItem = item.actor.items.get(item.actor.system.equipped.mainHand);
			if (item.system.useWeapon.accuracy) {
				data.useWeapon = true;

				if (mainHandItem && mainHandItem.type === 'weapon') {
					mainWeapon = mainHandItem;
					data.weapon = mainWeapon.name;
				}
			}

			if (item.system.useWeapon.accuracy && mainWeapon) {
				data.roll = {
					primary: mainWeapon.system.attributes.primary.value,
					secondary: mainWeapon.system.attributes.secondary.value,
					modifier: mainWeapon.system.accuracy.value + item.system.accuracy,
				};
			} else {
				data.roll = {
					primary: item.system.attributes.primary,
					secondary: item.system.attributes.secondary,
					modifier: item.system.accuracy,
				};
			}

			if (item.system.damage.hasDamage) {
				if (item.system.useWeapon.damage && mainWeapon) {
					data.damage = {
						value: item.system.damage.value + mainWeapon.system.damage.value,
						type: item.system.damage.type || mainWeapon.system.damageType.value,
						hrZero: item.system.damage.hrZero,
					};
				} else {
					data.damage = {
						value: item.system.damage.value,
						type: item.system.damage.type,
						hrZero: item.system.damage.hrZero,
					};
				}
			}
		}

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/caption/caption-skill'), data);
	}

	static #renderCombinedProgress(item) {
		let resource;
		if (item.system.hasResource.value) {
			resource = {
				data: item.system.rp,
				layout: 'stacked',
			};
		}

		let clock;
		if (item.system.hasClock.value) {
			clock = {
				data: item.system.progress,
			};
		}

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-ability-combined-progress'), {
			resource: resource,
			clock: clock,
		});
	}
}
