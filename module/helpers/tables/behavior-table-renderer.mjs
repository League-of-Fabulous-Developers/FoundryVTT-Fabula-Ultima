import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';

export class BehaviorTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'behaviors-table',
		getItems: BehaviorTableRenderer.#getItems,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: BehaviorTableRenderer.#getTableName, headerSpan: 2 }),
			summary: CommonColumns.textColumn({ alignment: 'start', getText: (item) => item.system.summary.value ?? '', tooltip: (item) => item.system.summary.value ?? '' }),
			weight: CommonColumns.textColumn({ columnLabel: 'FU.BehaviorWeight', importance: 'high', getText: (item) => item.system.weight.value }),
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Behavior', type: 'behavior' }),
		},
	};

	/**
	 * @type {boolean}
	 */
	#behaviorState;

	/**
	 * @param {boolean} behaviorState
	 */
	constructor(behaviorState) {
		super();
		this.#behaviorState = behaviorState;
	}

	static #getItems(actor) {
		return actor.items.filter((item) => foundry.utils.getProperty(item, 'system.isBehavior.value') === this.#behaviorState);
	}

	static #getTableName() {
		const name = this.#behaviorState ? 'FU.BehaviorActive' : 'FU.BehaviorInactive';
		return game.i18n.localize(name);
	}
}
