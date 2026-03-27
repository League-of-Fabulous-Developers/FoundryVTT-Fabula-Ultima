import { systemTemplatePath } from '../../../../helpers/system-utils.mjs';
import FUApplication from '../../../../ui/application.mjs';
import { InvocationTableRenderer } from '../../../../helpers/tables/invocation-table-renderer.mjs';
import { WELLSPRINGS } from './invoker-integration.mjs';
import { getTargeted } from '../../../../helpers/target-handler.mjs';

export class InvocationSelectionApplication extends FUApplication {
	static DEFAULT_OPTIONS = {
		classes: [`projectfu`, `fu-dialog`],
		window: {
			title: 'FU.ClassFeatureInvocationsSelectDialogTitle',
		},
		position: {
			width: 640,
			height: 'auto',
		},
		actions: {
			selectWellspring: InvocationSelectionApplication.#selectWellspring,
			useInvocation: InvocationSelectionApplication.#useInvocation,
		},
	};

	static PARTS = {
		app: {
			template: systemTemplatePath('feature/invoker/invocations-selection-application'),
		},
		footer: {
			template: `templates/generic/form-footer.hbs`,
		},
	};

	/** @type WellspringElementData **/
	#wellspring;
	/** @type **/
	#invocations;
	/** @type InvocationsDataModel **/
	#model;
	#invocationTable = new InvocationTableRenderer();

	constructor(model) {
		super();
		this.#model = model;
		this.#model.app ??= this;
		return this.#model.app;
	}

	/**
	 * @returns {WellspringElement[]}
	 */
	async getActiveWellsprings() {
		// TODO: Include
		const entries = await this.#model.actor.wellspringManager.getActiveWellsprings();
		return Object.entries(entries)
			.filter(([, value]) => value)
			.map(([key]) => key);
	}

	async _prepareContext(options = {}) {
		const activeWellsprings = await this.getActiveWellsprings();
		const targets = await getTargeted(false, false);
		if (!this.#wellspring) {
			this.#wellspring = WELLSPRINGS[activeWellsprings[0]];
			await this.onWellspringChanged();
		}
		const wellsprings = await Promise.all(
			activeWellsprings.map(async (element) => {
				return {
					wellspring: WELLSPRINGS[element],
					table: await this.#invocationTable.renderTable(this.#model, { wellspring: element }),
				};
			}),
		);

		return {
			invocations: this.#invocations,
			wellspring: this.#wellspring,
			targets: targets,
			buttons: [{ type: 'submit', icon: 'fa-solid fa-times', label: 'Close' }],
			wellsprings: wellsprings,
		};
	}

	async onWellspringChanged() {
		this.#invocations = await this.#model.getAvailableInvocations(this.#wellspring.key);
	}

	/**
	 * @this InvocationSelectionApplication
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	static async #selectWellspring(event, target) {
		const { element } = target.dataset;
		this.#wellspring = WELLSPRINGS[element];
		await this.onWellspringChanged();
		this.render(true);
	}

	/**
	 * @this InvocationSelectionApplication
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	static async #useInvocation(event, target) {
		const { level, element } = target.dataset;
		this.close({
			use: {
				element,
				invocation: level,
			},
		});
	}

	async _onFirstRender(context, options) {
		this.#invocationTable.activateListeners(this);
	}

	useInvocation(event) {
		const invocation = event.currentTarget.dataset.invocation;
		const element = event.currentTarget.closest('[data-element]').dataset.element;

		this.close({ use: { element, invocation } });
	}

	async close(options = {}) {
		const promises = [super.close(options)];
		delete this.#model.app;
		if (options.use) {
			promises.push(this.postInvocation(options.use.element, options.use.invocation));
		}
		return Promise.all(promises);
	}

	async postInvocation(element, invocation) {
		return this.#model.useInvocation(element, invocation);
	}
}
