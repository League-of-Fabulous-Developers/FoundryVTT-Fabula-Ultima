import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';

const technosphereItemTypes = new Set(['hoplosphere', 'mnemosphere']);

export class TechnospheresTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'technospheres-table',
		getItems: (document) => document.items.filter((item) => technosphereItemTypes.has(item.type)),
		renderDescription: TechnospheresTableRenderer.#renderDescription,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Technospheres', renderCaption: TechnospheresTableRenderer.#renderCaption, headerSpan: 2 }),
			details: {
				hideHeader: true,
				renderCell: TechnospheresTableRenderer.#renderDetails,
			},
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Technospheres', type: 'mnemosphere,hoplosphere' }),
		},
	};

	static #renderDescription() {
		return '';
	}

	static #renderCaption() {
		return '';
	}

	static #renderDetails() {
		return '';
	}
}
