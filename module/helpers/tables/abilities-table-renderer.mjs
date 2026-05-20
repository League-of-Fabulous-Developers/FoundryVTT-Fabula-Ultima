import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';
import { ExpressionContext } from '../../expressions/expressions.mjs';
import { SkillLikeTableHelper } from './skill-like-table-helper.mjs';

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
		const context = new ExpressionContext(item.actor, item, []);
		const data = {
			FU,
		};

		const mainWeapon = SkillLikeTableHelper.resolveMainWeapon(item, data);
		if (mainWeapon) {
			data.weapon = mainWeapon.name;
		}

		const checkData = SkillLikeTableHelper.resolveCheckData(item, context, mainWeapon);
		foundry.utils.mergeObject(data, checkData);

		const damageData = SkillLikeTableHelper.resolveDamageData(item, context, mainWeapon);
		foundry.utils.mergeObject(data, damageData);

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
