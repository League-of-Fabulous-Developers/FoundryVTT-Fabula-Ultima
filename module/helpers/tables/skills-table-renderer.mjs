import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { FU } from '../config.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { ExpressionContext } from '../../expressions/expressions.mjs';
import { SkillLikeTableHelper } from './skill-like-table-helper.mjs';

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
		const context = new ExpressionContext(item.actor, item, []);
		const data = {
			FU,
			class: item.system.class.value,
		};

		const clazz = await SkillLikeTableHelper.findMatchingClass(item);
		if (clazz) {
			data.class = clazz.name;
		}

		let mainWeapon = SkillLikeTableHelper.resolveMainWeapon(item);
		if (mainWeapon) {
			data.weapon = mainWeapon.name;
		}

		const checkData = await SkillLikeTableHelper.resolveCheckData(item, context, mainWeapon);
		foundry.utils.mergeObject(data, checkData);

		const damageData = await SkillLikeTableHelper.resolveDamageData(item, context, mainWeapon);
		foundry.utils.mergeObject(data, damageData);

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
