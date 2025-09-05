import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';

export class HeroicsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'heroics-table',
		getItems: (actor) => actor.itemTypes.heroic,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ headerSpan: 2 }),
			resourcePoints: CommonColumns.resourceColumn({
				action: 'updateHeroicResource',
				getResource: (item) => (item.system.hasResource.value ? item.system.rp : null),
				increaseAttributes: { 'data-resource-action': 'increment' },
				decreaseAttributes: { 'data-resource-action': 'decrement' },
				layout: 'stacked',
			}),
			type: CommonColumns.textColumn({
				columnLabel: 'FU.ItemType',
				getText: (item) =>
					({
						style: () => game.i18n.localize('FU.HeroicStyle'),
						skill: () => game.i18n.localize('FU.Heroic'),
					})[item.system.subtype.value]?.() ?? 'FU.Unknown',
				importance: 'high',
			}),
			controls: CommonColumns.itemControlsColumn({ type: 'heroic', label: 'FU.Heroic' }),
		},
	};
}
