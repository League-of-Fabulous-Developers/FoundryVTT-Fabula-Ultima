import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { FU } from '../config.mjs';
import { systemTemplatePath } from '../system-utils.mjs';

export class SkillsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'skills-table',
		getItems: (actor) => actor.itemTypes.skill,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ headerSpan: 2, renderCaption: SkillsTableRenderer.#renderCaption }),
			resourcePoints: CommonColumns.resourceColumn({
				action: 'updateSkillResource',
				getResource: (item) => (item.system.hasResource.value ? item.system.rp : null),
				increaseAttributes: { 'data-resource-action': 'increment' },
				decreaseAttributes: { 'data-resource-action': 'decrement' },
				layout: 'stacked',
			}),
			level: {
				renderHeader: () => game.i18n.localize('FU.SkillLevel'),
				renderCell: SkillsTableRenderer.#renderLevelCell,
			},
			controls: CommonColumns.itemControlsColumn({ type: 'skill', label: 'FU.Skill' }),
		},
	};

	static async #renderCaption(item) {
		const data = {
			FU,
			class: item.system.class.value,
		};

		let mainWeapon;
		{
			const mainHandItem = item.actor.items.get(item.actor.system.equipped.mainHand);
			if (item.system.useWeapon.accuracy) {
				data.useWeapon = true;

				if (mainHandItem && mainHandItem.type === 'weapon') {
					mainWeapon = mainHandItem;
					data.weapon = mainWeapon.name;
				}
			}
		}

		if (item.system.hasRoll.value) {
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

	static #renderLevelCell(item) {
		const { value: current, max } = item.system.level;
		const skillArr = Array(max)
			.fill(null)
			.map((value, index) => ({
				level: index + 1,
				reached: current > index,
			}));
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-skill-level'), { skillArr: skillArr });
	}
}
