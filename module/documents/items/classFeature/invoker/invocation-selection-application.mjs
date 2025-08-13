import { systemTemplatePath } from '../../../../helpers/system-utils.mjs';
import FUApplication from '../../../../ui/application.mjs';
import { WELLSPRINGS } from './invoker-integration.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

export class InvocationSelectionApplication extends FUApplication {
	static DEFAULT_OPTIONS = {
		classes: ['form', 'invocations-selection'],
		window: {
			title: 'FU.ClassFeatureInvocationsSelectDialogTitle',
		},
		position: {
			width: 350,
			height: 'auto',
		},
		actions: {
			useInvocation: InvocationSelectionApplication.UseInvocation,
		},
	};

	static PARTS = {
		app: {
			template: systemTemplatePath('feature/invoker/invocations-selection-application'),
		},
	};

	#model;

	constructor(model) {
		super();
		this.#model = model;
		this.#model.app ??= this;
		return this.#model.app;
	}

	async _prepareContext(options = {}) {
		const activeWellsprings = Object.entries(this.#model.actor.wellspringManager.activeWellsprings)
			.filter(([, value]) => value)
			.reduce((agg, [key, value]) => (agg[key] = value) && agg, {});

		const availableInvocations = {
			basic: ['basic'],
			advanced: ['basic', 'advanced'],
			superior: ['basic', 'advanced', 'superior1', 'superior2'],
		}[this.#model.level];

		const data = {};
		for (const [element] of Object.entries(activeWellsprings)) {
			const modelElement = this.#model[element];
			const invocations = {};
			for (const invocation of availableInvocations) {
				const modelInvocation = modelElement[invocation];
				invocations[invocation] = {
					name: modelInvocation.name,
					description: await TextEditor.enrichHTML(modelInvocation.description),
				};
			}
			data[element] = {
				name: WELLSPRINGS[element].name,
				icon: WELLSPRINGS[element].icon,
				invocations,
			};
		}

		return { wellsprings: data };
	}

	static UseInvocation(event, elem) {
		this.close({
			use: {
				element: elem.dataset.element,
				invocation: elem.dataset.invocation,
			},
		});
	}

	_onRender(context, options) {
		// Set width
		const activeWellsprings = Object.values(this.#model.actor.wellspringManager.activeWellsprings).filter((value) => value).length;
		foundry.utils.mergeObject(options, {
			position: {
				width: activeWellsprings * InvocationSelectionApplication.DEFAULT_OPTIONS.position.width,
			},
		});

		return super._onRender(context, options);
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
