import { systemAssetPath, systemTemplatePath } from '../../../../helpers/system-utils.mjs';
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
	#tableData = {};

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

		this.#tableData = {};

		return {
			buttons: [{ type: 'submit', icon: 'fa-solid fa-times', label: 'Close' }],
			wellsprings: await Promise.all(
				Object.keys(activeWellsprings).map(async (element) => {
					const tableData = availableInvocations.map((invocation) => {
						const id = foundry.utils.randomID();

						const data = {
							...this.#model[element][invocation],
							img: systemAssetPath(`affinities/icons/${this.getHexIcon(element)}.png`),
							parent: this.#model.actor,
							uuid: id,
							id,
							element,
							invocation,
						};
						this.#tableData[id] = data;
						return data;
					});

					return {
						wellspring: WELLSPRINGS[element],
						invocations: availableInvocations.map((invocation) => ({
							...this.#model[element][invocation],
							icon: WELLSPRINGS[element].icon,
							parent: this.#model.actor,
						})),
						table: await this.#invocationTable.renderTable(this.#model.actor, {
							invocations: tableData,
							tablePreset: 'invocation',
						}),
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

	async _onRender(context, options) {
		await super._onRender(context, options);

		// Attach our dataset properties for the element and invocation
		// which are used by the useInvocation function
		Object.values(this.#tableData).map((item) => {
			const container = this.element.querySelector(`[data-uuid="${item.uuid}"]`);
			if (container instanceof HTMLElement) {
				container.dataset.element = item.element;
				container.dataset.invocation = item.invocation;
			}
		});

		this.#invocationTable.activateListeners(this);
	}

	/**
	 * Retrieve the file name for the icon to use for a given invocation.
	 *
	 * This is primarily to translate 'lightning' and 'water' wellspring elements to damage type icons
	 * @param {string} element
	 * @param {string} invocation
	 * @returns {string}
	 */
	getHexIcon(element, invocation) {
		switch (element) {
			case 'lightning':
				return 'bolt';
			case 'water':
				return 'ice';
			default:
				return element;
		}
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
