import { WELLSPRINGS } from './invoker-integration.mjs';
import { InvocationSelectionApplication } from './invocation-selection-application.mjs';
import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { CHECK_FLAVOR } from '../../../../checks/default-section-order.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { CommonEvents } from '../../../../checks/common-events.mjs';
import { FeatureTraits } from '../../../../pipelines/traits.mjs';
import { CheckConfiguration } from '../../../../checks/check-configuration.mjs';
import { ActionCostDataModel } from '../../common/action-cost-data-model.mjs';
import { ResourcePipeline } from '../../../../pipelines/resource-pipeline.mjs';

const BASIC = 'FU.ClassFeatureInvocationsBasicName';
const ADVANCED = 'FU.ClassFeatureInvocationsAdvancedName';

const FIRST_SUPERIOR = 'FU.ClassFeatureInvocationsSuperiorNameFirst';
const SECOND_SUPERIOR = 'FU.ClassFeatureInvocationsSuperiorNameSecond';

const RANKS = {
	basic: 'FU.ClassFeatureInvocationsLevelBasic',
	advanced: 'FU.ClassFeatureInvocationsLevelAdvanced',
	superior: 'FU.ClassFeatureInvocationsLevelSuperior',
};

const LOCALIZED_RANKS = {
	basic: 'FU.ClassFeatureInvocationsLevelBasic',
	advanced: 'FU.ClassFeatureInvocationsLevelAdvanced',
	superior1: 'FU.ClassFeatureInvocationsLevelSuperior',
	superior2: 'FU.ClassFeatureInvocationsLevelSuperior',
};

/**
 * @typedef {'basic'|'advanced'|'superior1'|'superior2'} InvocationLevel
 */

const invocationKey = 'invocation';

/**
 * @type RenderCheckHook
 */
const onRenderCheck = async (data, check, actor, item, flags) => {
	if (check.type === 'display' && item?.system?.data instanceof InvocationsDataModel) {
		const { element, invocation } = check.additionalData[invocationKey];
		data.tags.push({
			tag: 'FU.Rank',
			value: game.i18n.localize(RANKS[item.system.data.level]),
			separator: ':',
		});
		// TODO: For custom invocations??
		if (!check.additionalData[invocationKey]) {
			CommonSections.description(data.sections, item.system.description, item.system.summary.value);
		} else {
			data.sections.push({
				partial: 'systems/projectfu/templates/feature/invoker/invocation-use-flavor.hbs',
				data: {
					uuid: item.uuid,
					id: item.id,
					img: item.img,
					name: item.system.data[element][invocation].name,
					icon: WELLSPRINGS[element].icon,
				},
				order: CHECK_FLAVOR,
			});
			CommonSections.description(data.sections, item.system.data[element][invocation].description);
		}
		const config = CheckConfiguration.configure(check);
		config.addTraits(FeatureTraits.Invocation);
		switch (invocation) {
			case 'basic':
				config.addTraits(FeatureTraits.InvocationBlast);
				break;
			case 'advanced':
				config.addTraits(FeatureTraits.InvocationHex);
				break;
		}
		/** @type ResourceExpense **/
		const inspector = CheckConfiguration.inspect(check);
		const targets = inspector.getTargetsOrDefault();
		const cost = new ActionCostDataModel({
			resource: 'mp',
			amount: 5,
			perTarget: false,
		});
		const expense = await ResourcePipeline.calculateExpense(cost, actor, item, targets);
		await CommonEvents.calculateExpense(actor, item, targets, expense);
		CommonSections.expense(data, actor, item, targets, flags, expense);

		await CommonEvents.feature(actor, item, [FeatureTraits.Invocation], targets, data);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {String} level
 * @property {String} description
 */
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

	/**
	 * @typedef AvailableInvocationData
	 * @property key
	 * @property img
	 * @property wellspring
	 * @property invocation
	 * @property name
	 * @property description
	 */

	/**
	 * @param {WellspringElement}  wellspring
	 * @returns {Promise<AvailableInvocationData[]>
	 */
	async getAvailableInvocations(wellspring) {
		/**
		 * @type {String[]}
		 */
		const availableInvocations = {
			basic: ['basic'],
			advanced: ['basic', 'advanced'],
			superior: ['basic', 'advanced', 'superior1', 'superior2'],
		}[this.level];

		return Promise.all(
			availableInvocations.map(async (invocation) => ({
				key: `${wellspring}:${invocation}`,
				label: LOCALIZED_RANKS[invocation],
				img: this.item.img,
				wellspring,
				level: invocation,
				invocation,
				name: this[wellspring][invocation].name,
				description: await TextEditor.enrichHTML(this[wellspring][invocation].description),
			})),
		);
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
				group: 'invocations',
				navSelector: '.sheet-tabs',
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
