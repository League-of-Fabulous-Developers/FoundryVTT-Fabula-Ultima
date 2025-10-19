import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';

export class InvocationTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'invocations-table',
		draggable: false,
		getItems: (actor, { invocations }) => invocations,
		renderDescription: async (item) => {
			const enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.description);
			return `<div class="description-with-tags" style="pointer-events: none">${enriched}</div>`;
		},
		columns: {
			name: CommonColumns.itemNameColumn({ columnLabel: 'FU.Invocation' }),
			controls: {
				headerAlignment: 'end',
				renderHeader: InvocationTableRenderer.#renderControlsHeader,
				renderCell: InvocationTableRenderer.#renderControls,
			},
		},
	};

	static #renderControlsHeader() {
		return `<div class="header-item-controls"></div>`;
	}

	static #renderControls(invocation) {
		return `<div class="cell-item-controls"><a class="cell-item-controls__control" data-action="roll"><i class="fa-solid fa-share"></i></a></div>`;
	}
}
