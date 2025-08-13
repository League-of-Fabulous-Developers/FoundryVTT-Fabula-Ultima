import { getTasteAliasFlag, TASTES } from './ingredient-data-model.mjs';
import { CookingApplication } from './cooking-application.mjs';
import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';

/**
 * @type RenderCheckHook
 */
const renderCheck = (sections, check, actor, item, additionalFlags) => {
	if (check.type === 'display' && item?.system?.data instanceof CookbookDataModel && check.additionalData['action'] === 'cooking') {
		sections.push({
			partial: 'systems/projectfu/templates/feature/gourmet/cooking-chat-message.hbs',
			data: check.additionalData['cooking'],
		});
	}
};

Hooks.on(CheckHooks.renderCheck, renderCheck);

export class CookbookDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField, SchemaField } = foundry.data.fields;

		const tastes = Object.keys(TASTES);
		const combinations = {};

		for (let i = 0; i < tastes.length; i++) {
			for (let j = i; j < tastes.length; j++) {
				combinations[`${tastes[i]}_${tastes[j]}`] = new SchemaField({
					taste1: new StringField({ initial: tastes[i], choices: [tastes[i]] }),
					taste2: new StringField({ initial: tastes[j], choices: [tastes[j]] }),
					effect: new HTMLField(),
				});
			}
		}
		return {
			combinations: new SchemaField(combinations),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/gourmet/cookbook-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/gourmet/cookbook-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureCookbook';
	}

	static getAdditionalData(model) {
		let tastes = { ...TASTES };
		if (model.actor) {
			for (const taste of Object.keys(tastes)) {
				tastes[taste] = model.actor.getFlag(SYSTEM, getTasteAliasFlag(taste)) || TASTES[taste];
			}
		}
		return {
			tastes: tastes,
			recipes: Object.values(model.combinations).filter((combination) => combination.effect).length,
		};
	}

	static activateListeners(html, item, sheet) {
		const htmlFormElement = html.closest('form');
		const taste1Radio = htmlFormElement.elements.namedItem('taste1');
		const taste2Radio = htmlFormElement.elements.namedItem('taste2');

		sheet.taste1 ??= taste1Radio.value;
		sheet.taste2 ??= taste2Radio.value;

		taste1Radio.value = sheet.taste1;
		taste2Radio.value = sheet.taste2;

		console.log(sheet.taste1, sheet.taste2);
		console.log(taste1Radio, taste2Radio);

		const toggleHighlight = () => {
			console.log(sheet.taste1, sheet.taste2);
			html.querySelectorAll(`[data-taste1][data-taste2]`).forEach((el) =>
				el.classList.toggle('active', (el.dataset.taste1 === sheet.taste1 && el.dataset.taste2 === sheet.taste2) || (el.dataset.taste1 === sheet.taste2 && el.dataset.taste2 === sheet.taste1)),
			);
		};
		toggleHighlight();

		html.querySelectorAll('input[type=radio][name=taste1]').forEach((el) => {
			el.addEventListener('change', (e) => {
				sheet.taste1 = e.currentTarget.value;
				toggleHighlight();
			});
		});
		html.querySelectorAll('input[type=radio][name=taste2]').forEach((el) => {
			el.addEventListener('change', (e) => {
				sheet.taste2 = e.currentTarget.value;
				toggleHighlight();
			});
		});
	}

	static getTabConfigurations() {
		return [
			{
				group: 'cookbookTabs',
				navSelector: '.cookbook-tabs',
				contentSelector: '.cookbook-content',
				initial: 'summaryTab',
			},
		];
	}

	/**
	 * @param {Taste} taste1
	 * @param {Taste} taste2
	 * @return {{taste1: Taste, taste2: Taste, effect: string}, null}
	 */
	getCombination(taste1, taste2) {
		return this.combinations[`${taste1}_${taste2}`] || this.combinations[`${taste2}_${taste1}`] || null;
	}

	static roll(model, item, isShift) {
		new CookingApplication(model).render(true);
	}

	prepareData() {
		this.selected ??= 'bitter+bitter';
	}
}
