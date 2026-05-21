import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { ExpressionContext } from '../../expressions/expressions.mjs';
import { FU } from '../config.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { SkillLikeTableHelper } from './skill-like-table-helper.mjs';

export class HeroicsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'heroics-table',
		getItems: (actor) => actor.itemTypes.heroic,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ headerSpan: 2, renderCaption: HeroicsTableRenderer.#renderCaption }),
			resourcePoints: CommonColumns.resourceColumn({
				action: 'updateHeroicResource',
				getResource: (item) => (item.system.hasResource.value ? item.system.rp : null),
				increaseAttributes: { 'data-resource-action': 'increment' },
				decreaseAttributes: { 'data-resource-action': 'decrement' },
				layout: 'stacked',
			}),
			type: CommonColumns.textColumn({
				columnLabel: 'FU.ItemType',
				getText: (item) =>
					({
						style: () => game.i18n.localize('FU.HeroicStyle'),
						skill: () => game.i18n.localize('FU.Heroic'),
					})[item.system.subtype.value]?.() ?? 'FU.Unknown',
				importance: 'high',
			}),
			controls: CommonColumns.itemControlsColumn({ type: 'heroic', label: 'FU.Heroic' }),
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
}
