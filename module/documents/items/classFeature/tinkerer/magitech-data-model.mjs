import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { createCheckMessage, rollCheck } from '../../../../helpers/checks.mjs';
import { ChecksV2 } from '../../../../checks/checks-v2.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

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
		const currentIns = model.actor.system.attributes.ins.current;

		switch (model.rank) {
			case 'basic': {
				/** @type CheckParameters */
				const check = {
					check: {
						title: game.i18n.localize('FU.ClassFeatureMagitechOverride'),
						attr1: {
							attribute: 'ins',
							dice: currentIns,
						},
						attr2: {
							attribute: 'ins',
							dice: currentIns,
						},
						modifier: 0,
						bonus: 0,
					},
				};
				rollCheck(check).then((value) => createCheckMessage(value, { [SYSTEM]: { [Flags.ChatMessage.Item]: this } }));
				break;
			}
			case 'advanced':
			case 'superior': {
				const rankField = model.rank;
				const description = await TextEditor.enrichHTML(model[rankField] || '');

				// Inject a renderCheck hook to display the enriched description
				Hooks.once('projectfu.renderCheck', (sections, check, actor, item) => {
					sections.push({
						content: `<div class="chat-desc">${description}</div>`,
						order: -1000,
					});
				});

				return ChecksV2.display(item.actor, item);
			}

			default:
				ui.notifications.warn(`Unknown rank: ${model.rank}`);
		}
	}
}
