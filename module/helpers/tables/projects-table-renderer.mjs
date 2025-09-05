import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';

export class ProjectsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'projects-table',
		getItems: (document) => document.itemTypes.project,
		renderDescription: CommonDescriptions.descriptionWithTags((fuItem) => fuItem.system.getTags()),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Projects' }),
			progressBar: CommonColumns.progressBarColumn({ columnName: 'FU.ProjectStatus', getProgress: (item) => item.system.progress }),
			progress: CommonColumns.resourceColumn({
				columnName: 'FU.Progress',
				getResource: (item) => item.system.progress,
				action: 'updateProgress',
				increaseAttributes: { 'data-progress-action': 'increase' },
				decreaseAttributes: { 'data-progress-action': 'decrease' },
			}),
			controls: CommonColumns.itemControlsColumn({ type: 'project', label: 'FU.Project' }),
		},
	};
}
