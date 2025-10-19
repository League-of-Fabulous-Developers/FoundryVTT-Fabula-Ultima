import { systemTemplatePath } from '../../../../helpers/system-utils.mjs';
import FUApplication from '../../../../ui/application.mjs';
import { InvocationTableRenderer } from '../../../../helpers/tables/invocation-table-renderer.mjs';
import { WELLSPRINGS } from './invoker-integration.mjs';

export class InvocationSelectionApplication extends FUApplication {
	static DEFAULT_OPTIONS = {
		classes: ['form', 'invocations-selection'],
		window: {
			title: 'FU.ClassFeatureInvocationsSelectDialogTitle',
		},
		position: {
			width: 500,
			height: 'auto',
		},
		actions: {
			useInvocation: InvocationSelectionApplication.UseInvocation,
			// The item name template from the table renderer we're using
			// hard codes the data-action on its icon to `roll`
			roll: InvocationSelectionApplication.UseInvocation,
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

	#model;
	#invocationTable = new InvocationTableRenderer();

	constructor(model) {
		super();
		this.#model = model;
		this.#model.app ??= this;
		return this.#model.app;
	}

	async _prepareContext(options = {}) {
		const activeWellsprings = Object.entries(this.#model.actor.wellspringManager.activeWellsprings)
			.filter(([, value]) => value)
			.map(([key]) => key);

		return {
			buttons: [{ type: 'submit', icon: 'fa-solid fa-times', label: 'Close' }],
			wellsprings: await Promise.all(
				activeWellsprings.map(async (element) => {
					return {
						wellspring: WELLSPRINGS[element],
						table: await this.#invocationTable.renderTable(this.#model, { wellspring: element }),
					};
				}),
			),
		};
	}

	static UseInvocation(event, elem) {
		const invocation = elem.closest(`[data-invocation]`).dataset.invocation;
		const element = elem.closest(`[data-element]`).dataset.element;
		this.close({
			use: {
				element,
				invocation,
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
