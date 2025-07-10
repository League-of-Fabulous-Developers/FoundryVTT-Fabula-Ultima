import { WELLSPRINGS } from './invoker-integration.mjs';
import { InvocationSelectionApplication } from './invocation-selection-application.mjs';
import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { CHECK_FLAVOR } from '../../../../checks/default-section-order.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

const BASIC = 'FU.ClassFeatureInvocationsBasicName';

const ADVANCED = 'FU.ClassFeatureInvocationsAdvancedName';

const FIRST_SUPERIOR = 'FU.ClassFeatureInvocationsSuperiorNameFirst';
const SECOND_SUPERIOR = 'FU.ClassFeatureInvocationsSuperiorNameSecond';

const RANKS = {
	basic: 'FU.ClassFeatureInvocationsLevelBasic',
	advanced: 'FU.ClassFeatureInvocationsLevelAdvanced',
	superior: 'FU.ClassFeatureInvocationsLevelSuperior',
};

const invocationKey = 'invocation';

/**
 * @type RenderCheckHook
 */
const onRenderCheck = (sections, check, actor, item, additionalFlags) => {
	if (check.type === 'display' && item?.system?.data instanceof InvocationsDataModel) {
		if (!check.additionalData[invocationKey]) {
			CommonSections.tags(sections, [
				{
					tag: 'FU.Rank',
					value: game.i18n.localize(RANKS[item.system.data.level]),
					separator: ':',
				},
			]);
			CommonSections.description(sections, item.system.description, item.system.summary.value);
		} else {
			const { element, invocation } = check.additionalData[invocationKey];
			sections.push({
				partial: 'systems/projectfu/templates/feature/invoker/invocation-use-flavor.hbs',
				data: {
					uuid: item.uuid,
					id: item.id,
					name: item.system.data[element][invocation].name,
					icon: WELLSPRINGS[element].icon,
				},
				order: CHECK_FLAVOR,
			});
			CommonSections.description(sections, item.system.data[element][invocation].description);
		}
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

export class InvocationsDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, SchemaField, HTMLField } = foundry.data.fields;
		const schema = {
			level: new StringField({ initial: 'basic', choices: Object.keys(RANKS) }),
			description: new HTMLField(),
		};

		for (const [key, wellspring] of Object.entries(WELLSPRINGS)) {
			schema[key] = new SchemaField({
				basic: new SchemaField({
					name: new StringField({ initial: () => game.i18n.format(BASIC, { element: game.i18n.localize(wellspring.element) }) }),
					description: new HTMLField(),
				}),
				advanced: new SchemaField({
					name: new StringField({ initial: () => game.i18n.format(ADVANCED, { element: game.i18n.localize(wellspring.element) }) }),
					description: new HTMLField(),
				}),
				superior1: new SchemaField({
					name: new StringField({ initial: () => game.i18n.format(FIRST_SUPERIOR, { element: game.i18n.localize(wellspring.element) }) }),
					description: new HTMLField(),
				}),
				superior2: new SchemaField({
					name: new StringField({ initial: () => game.i18n.format(SECOND_SUPERIOR, { element: game.i18n.localize(wellspring.element) }) }),
					description: new HTMLField(),
				}),
			});
		}

		return schema;
	}

	static get template() {
		return 'systems/projectfu/templates/feature/invoker/invocations-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/invoker/invocations-preview.hbs';
	}

	static get expandTemplate() {
		return 'systems/projectfu/templates/feature/invoker/invocations-expand.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureInvocations';
	}

	static getTabConfigurations() {
		return [
			{
				group: 'invocationsTabs',
				navSelector: '.invocations-tabs',
				contentSelector: '.invocations-content',
				initial: 'description',
			},
		];
	}

	static async getAdditionalData(model) {
		return {
			levels: RANKS,
			wellsprings: WELLSPRINGS,
			activeWellsprings: model.actor?.wellspringManager.activeWellsprings ?? {},
			enrichedDescription: await TextEditor.enrichHTML(model.description),
		};
	}

	static async roll(model, item, isShift) {
		if (isShift) {
			return Checks.display(item.actor, item);
		} else {
			const activeWellsprings = model.actor?.wellspringManager.activeWellsprings;
			if (!activeWellsprings) return;
			new InvocationSelectionApplication(model).render(true);
		}
	}

	/**
	 * @param {WellspringElement} element
	 * @param {"basic", "advanced", "superior1", "superior2"} invocation
	 */
	useInvocation(element, invocation) {
		return Checks.display(this.actor, this.item, (check) => {
			check.additionalData[invocationKey] = {
				element,
				invocation,
			};
		});
	}
}
