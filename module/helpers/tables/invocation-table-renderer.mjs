import { FUTableRenderer } from './table-renderer.mjs';
import { systemTemplatePath } from '../system-utils.mjs';

export class InvocationTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'invocations-table',
		tablePreset: 'custom',
		getItems: (invocationsDataModel, { wellspring }) => {
			const availableInvocations = {
				basic: ['basic'],
				advanced: ['basic', 'advanced'],
				superior: ['basic', 'advanced', 'superior1', 'superior2'],
			}[invocationsDataModel.level];

			return availableInvocations.map((invocation) => ({
				key: `${wellspring}:${invocation}`,
				img: invocationsDataModel.item.img,
				wellspring,
				invocation,
				name: invocationsDataModel[wellspring][invocation].name,
				description: invocationsDataModel[wellspring][invocation].description,
			}));
		},
		renderDescription: async (item) => {
			const enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.description);
			return `<div class="description-with-tags" style="pointer-events: none">${enriched}</div>`;
		},
		columns: {
			name: {
				headerAlignment: 'start',
				renderHeader: InvocationTableRenderer.#renderNameHeader,
				renderCell: InvocationTableRenderer.#renderName,
			},
			controls: {
				headerAlignment: 'end',
				renderHeader: InvocationTableRenderer.#renderControlsHeader,
				renderCell: InvocationTableRenderer.#renderControls,
			},
		},
		advancedConfig: {
			getKey: (invocationItem) => invocationItem.key,
			additionalRowAttributes: [
				{ attributeName: 'data-element', getAttributeValue: (invocationItem) => invocationItem.wellspring },
				{ attributeName: 'data-invocation', getAttributeValue: (invocationItem) => invocationItem.invocation },
			],
		},
	};

	static #renderControlsHeader() {
		return `<div class="header-item-controls"></div>`;
	}

	static #renderControls(invocation) {
		return `<div class="cell-item-controls"><a class="cell-item-controls__control" data-action="roll"><i class="fa-solid fa-share"></i></a></div>`;
	}

	static #renderNameHeader() {
		return 'FU.Name';
	}

	static async #renderName(invocation) {
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-invocation-name'), invocation);
	}
}
