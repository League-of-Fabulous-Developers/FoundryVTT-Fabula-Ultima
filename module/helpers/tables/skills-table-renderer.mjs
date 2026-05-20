import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { FU } from '../config.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { ExpressionContext } from '../../expressions/expressions.mjs';
import { CompendiumIndex } from '../../ui/compendium/compendium-index.mjs';
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

		let mainWeapon = SkillLikeTableHelper.resolveMainWeapon(item, data);
		if (mainWeapon) {
			data.weapon = mainWeapon.name;
		}

		const checkData = SkillLikeTableHelper.resolveCheckData(item, context, mainWeapon);
		foundry.utils.mergeObject(data, checkData);

		const damageData = SkillLikeTableHelper.resolveDamageData(item, context, mainWeapon);
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

	static findMatchingClassInArray(item, classes) {
		const className = item.system?.class?.value;
		if (className) {
			// Search for a class with the same name. If found, set the skill's class attribute to match its fu-id
			const classFound = classes.find((classItem) => {
				return classItem.name === className;
			});
			if (classFound?.system?.fuid) {
				return classFound;
			}

			// Search for a class with a fuid that matches the slugified attribute.
			const classNameSlug = game.projectfu.util.slugify(className);
			const classFoundWithFuid = classes.find((classItem) => {
				return classItem.system?.fuid === classNameSlug;
			});
			if (classFoundWithFuid?.system?.fuid) {
				return classFoundWithFuid;
			}
		}
		return;
	}

	static async findMatchingClass(item) {
		if (item.system.class.value) {
			const actorClasses = item.actor.items.filter((arrayItem) => {
				return arrayItem.type === 'class';
			});
			const foundActorClass = SkillsTableRenderer.findMatchingClassInArray(item, actorClasses);
			if (foundActorClass) {
				return foundActorClass;
			}

			const worldClasses = game.items.filter((arrayItem) => {
				return arrayItem.type === 'class';
			});
			const foundWorldClass = SkillsTableRenderer.findMatchingClassInArray(item, worldClasses);
			if (foundWorldClass) {
				return foundWorldClass;
			}

			const compendiumClasses = await CompendiumIndex.instance.getClasses();
			if (compendiumClasses?.class) {
				const foundCompendiumClass = SkillsTableRenderer.findMatchingClassInArray(item, compendiumClasses.class);
				if (foundCompendiumClass) {
					return foundCompendiumClass;
				}
			}
		}
		return;
	}
}
