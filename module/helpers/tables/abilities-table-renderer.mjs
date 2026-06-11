import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';
import { ExpressionContext } from '../../expressions/expressions.mjs';
import { SkillLikeTableHelper } from './skill-like-table-helper.mjs';

const itemTypeIcons = {
	miscAbility: 'before-ability-icon',
};

export class AbilitiesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'abilities-table',
		getItems: AbilitiesTableRenderer.#getItems,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({
				columnName: AbilitiesTableRenderer.#getNameColumnName,
				headerSpan: 2,
				renderCaption: AbilitiesTableRenderer.#renderCaption,
				cssClass: AbilitiesTableRenderer.#getItemIcon,
			}),
			combinedProgress: {
				hideHeader: true,
				renderCell: AbilitiesTableRenderer.#renderCombinedProgress,
			},
			controls: CommonColumns.itemControlsColumn({ type: AbilitiesTableRenderer.#getItemType, label: AbilitiesTableRenderer.#getItemTypeLabel }),
		},
	};

	#itemType;

	constructor(itemType, overrides) {
		super(overrides);
		if (this.tableConfig.getItems === AbilitiesTableRenderer.#getItems && !itemType) {
			throw new Error('Must provide itemType');
		}
		this.#itemType = itemType;
	}

	static #getItems(document) {
		return document.itemTypes[this.#itemType];
	}

	static #getNameColumnName() {
		switch (this.#itemType) {
			case 'rule':
				return game.i18n.localize('FU.SpecialRules');
			case 'miscAbility':
				return game.i18n.localize('FU.OtherAction');
			default:
				return game.i18n.localize(CONFIG.Item.typeLabels[this.#itemType] ?? this.#itemType);
		}
	}

	static #getItemIcon(item) {
		if (item.parent.type === 'npc') {
			return itemTypeIcons[item.type] || '';
		} else {
			return '';
		}
	}

	static #getItemType() {
		return this.#itemType;
	}

	static #getItemTypeLabel() {
		return CONFIG.Item.typeLabels[this.#itemType] ?? this.#itemType;
	}

	static async #renderCaption(item) {
		const context = new ExpressionContext(item.actor, item, []);
		const data = {
			FU,
		};

		const mainWeapon = SkillLikeTableHelper.resolveMainWeapon(item);
		if (mainWeapon) {
			data.weapon = mainWeapon.name;
		}

		const checkData = await SkillLikeTableHelper.resolveCheckData(item, context, mainWeapon);
		foundry.utils.mergeObject(data, checkData);

		const damageData = await SkillLikeTableHelper.resolveDamageData(item, context, mainWeapon);
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
