import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';

const MAGITECH_RANK = 'MagitechRank';

const RANK_TRANSLATION_KEYS = {
	basic: 'FU.ClassFeatureGadgetsRankBasic',
	advanced: 'FU.ClassFeatureGadgetsRankAdvanced',
	superior: 'FU.ClassFeatureGadgetsRankSuperior',
};

// Inject a renderCheck hook to display the enriched description
Hooks.on('projectfu.renderCheck', (sections, check, actor, item) => {
	if (item?.system?.data instanceof MagitechDataModel) {
		const rank = check.additionalData[MAGITECH_RANK];

		if (rank) {
			CommonSections.tags(sections, [{ tag: 'FU.ClassFeatureGadgetsRank', value: game.i18n.localize(RANK_TRANSLATION_KEYS[rank]), separator: ':' }]);
		}

		CommonSections.description(sections, item.system.data.description, item.system.summary.value);

		if (rank) {
			sections.push(async () => ({
				content: `<div class="chat-desc">${await TextEditor.enrichHTML(item.system.data[rank] || '')}</div>`,
			}));
		}
	}
});

/**
 * @property {'basic', 'advanced', 'superior'} rank
 * @property {string} description
 * @property {string} basic
 * @property {string} advanced
 * @property {string} superior
 */
export class MagitechDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField } = foundry.data.fields;
		return {
			rank: new StringField({
				initial: 'basic',
				nullable: false,
				blank: true,
				choices: ['basic', 'advanced', 'superior'],
			}),
			description: new HTMLField(),
			basic: new HTMLField(),
			advanced: new HTMLField(),
			superior: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-magitech-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-gadgets-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureMagitech';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			ranks: {
				basic: 'FU.ClassFeatureGadgetsRankBasic',
				advanced: 'FU.ClassFeatureGadgetsRankAdvanced',
				superior: 'FU.ClassFeatureGadgetsRankSuperior',
			},
		};
	}

	/** @override */
	static getTabConfigurations() {
		return [
			{
				group: 'magitechTabs',
				navSelector: '.magitech-tabs',
				contentSelector: '.magitech-content',
				initial: 'description',
			},
		];
	}

	/**
	 * @param {MagitechDataModel} model
	 * @return {Promise<void>}
	 */
	static async roll(model, item, isShift) {
		if (isShift) {
			return Checks.display(item.actor, item);
		}

		const availableRanks = [];
		if (model.rank === 'basic') {
			availableRanks.push('basic');
		} else if (model.rank === 'advanced') {
			availableRanks.push('basic', 'advanced');
		} else if (model.rank === 'superior') {
			availableRanks.push('basic', 'advanced', 'superior');
		}
		let selectedRank;
		if (availableRanks.length > 1) {
			const result = await foundry.applications.api.DialogV2.input({
				window: { title: game.i18n.localize('FU.ClassFeatureMagitech') },
				content: `
					<div>
						<select name="rank">
							${availableRanks.map((r) => `<option value="${r}">${game.i18n.localize(RANK_TRANSLATION_KEYS[r])}</option>`).join('\n')}
						</select>
					</div>`,
				rejectClose: false,
			});
			if (result) {
				selectedRank = result.rank;
			} else {
				return;
			}
		} else {
			selectedRank = availableRanks[0];
		}
		switch (selectedRank) {
			case 'basic': {
				return Checks.attributeCheck(item.actor, { primary: 'ins', secondary: 'ins' }, item, (check) => {
					check.additionalData[MAGITECH_RANK] = selectedRank;
				});
			}
			case 'advanced':
			case 'superior': {
				return Checks.display(item.actor, item, (check) => {
					check.additionalData[MAGITECH_RANK] = selectedRank;
				});
			}
			default:
				ui.notifications.warn(`Unknown rank: ${model.rank}`);
		}
	}
}
