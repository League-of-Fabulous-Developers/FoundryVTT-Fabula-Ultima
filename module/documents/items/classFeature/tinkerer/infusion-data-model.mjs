import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU } from '../../../../helpers/config.mjs';
import { ClassFeatureTypeDataModel } from '../class-feature-type-data-model.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../../checks/check-configuration.mjs';
import { CharacterDataModel } from '../../../actors/character/character-data-model.mjs';
import { ChooseInfusionDialog } from './choose-infusion-dialog.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { CHECK_DETAILS } from '../../../../checks/default-section-order.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { ActionCostDataModel } from '../../common/action-cost-data-model.mjs';

const infusionKey = 'infusion';

/**
 * @param {ChatLog} application
 * @param {ContextMenuEntry[]} menuItems
 */
function onGetChatLogEntryContext(application, menuItems) {
	menuItems.push({
		name: 'FU.ClassFeatureInfusionsApply',
		icon: '<i class="fa-solid fa-flask-vial"></i>',
		condition: (li) => {
			const messageId = li.dataset.messageId;
			const message = game.messages.get(messageId);
			const actor = ChatMessage.getSpeakerActor(message.speaker);
			const checkInspector = CheckConfiguration.inspect(message);
			if (Checks.isCheck(message, 'accuracy') && checkInspector.getDamage() && !checkInspector.getCheck().additionalData[infusionKey] && actor && actor.isOwner && actor.system instanceof CharacterDataModel) {
				return actor.itemTypes.classFeature.some((value) => value.system instanceof ClassFeatureTypeDataModel && value.system.data instanceof InfusionsDataModel && actor.system.resources.ip.value >= value.system.data.ipCost);
			}
		},
		callback: async (li) => {
			const messageId = li.dataset.messageId;
			const message = game.messages.get(messageId);
			const actor = ChatMessage.getSpeakerActor(message.speaker);
			const inspector = CheckConfiguration.inspect(message);

			const infusions = actor.itemTypes.classFeature.find((value) => value.system instanceof ClassFeatureTypeDataModel && value.system.data instanceof InfusionsDataModel);
			const infusionData = infusions.system.data;
			const infusion = await ChooseInfusionDialog.prompt(infusionData);
			if (infusion) {
				await Checks.modifyCheck(inspector.getCheck().id, (check) => {
					CheckConfiguration.configure(check).modifyDamage((damage) => {
						damage.type = infusion.changedDamageType;
						damage.modifiers.push({
							label: `${infusions.name}: ${infusion.name}`,
							value: infusion.extraDamage,
						});
						return damage;
					});
					check.additionalData[infusionKey] = {
						itemName: infusions.name,
						itemImg: infusions.img,
						itemId: infusions.id,
						infusionName: infusion.name,
						ipCost: infusionData.ipCost,
						description: infusion.description,
					};
				});
			}
		},
	});
}

Hooks.on('getChatMessageContextOptions', onGetChatLogEntryContext);

/**
 * @type RenderCheckHook
 */
const onRenderCheck = (sections, check, actor, item, additionalFlags) => {
	const infusionData = check.additionalData[infusionKey];
	if (infusionData) {
		sections.push({
			order: CHECK_DETAILS + 1,
			content: `
              <div class='detail-desc flexrow flex-group-center desc' style='padding: 4px;'>
                <img src="${infusionData.itemImg}" alt="Image" data-item-id="${infusionData.itemId}" class="item-img" style="max-width: 1.5em; cursor: pointer;">
                <div>
                  <span style="font-size: 105%;">
                    <span>${infusionData.itemName}:</span>
                    <strong>${infusionData.infusionName}</strong>
                  </span>
                  <div>${infusionData.description}</div>
                </div>
              </div>
            `,
		});
		const cost = new ActionCostDataModel({ resource: 'ip', amount: infusionData.ipCost, perTarget: false });
		const targets = CheckConfiguration.inspect(check).getTargetsOrDefault();
		CommonSections.spendResource(sections, actor, actor.items.get(infusionData.itemId), cost, targets, additionalFlags);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @extends foundry.abstract.DataModel
 * @property {string} name
 * @property {string} description
 * @property {number} extraDamage
 * @property {'',DamageType} changedDamageType
 */
class InfusionDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, NumberField } = foundry.data.fields;
		return {
			name: new StringField({ initial: '' }),
			description: new StringField({ initial: '' }),
			extraDamage: new NumberField({ initial: 5, min: 0 }),
			changedDamageType: new StringField({ initial: '', blank: true, choices: [...Object.keys(FU.damageTypes)] }),
		};
	}
}

/**
 * @extends ClassFeatureDataModel
 * @property {'basic','advanced','superior'} rank
 * @property {number} ipCost
 * @property {string} description
 * @property {InfusionDataModel[]} basicInfusions
 * @property {InfusionDataModel[]} advancedInfusions
 * @property {InfusionDataModel[]} superiorInfusions
 */
export class InfusionsDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { StringField, NumberField, HTMLField, ArrayField, EmbeddedDataField } = foundry.data.fields;
		return {
			rank: new StringField({
				initial: 'basic',
				nullable: false,
				choices: ['basic', 'advanced', 'superior'],
			}),
			ipCost: new NumberField({ min: 0, initial: 2, nullable: false }),
			description: new HTMLField(),
			basicInfusions: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
			advancedInfusions: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
			superiorInfusions: new ArrayField(new EmbeddedDataField(InfusionDataModel, {}), {}),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-infusions-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-gadgets-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureInfusions';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			ranks: {
				basic: 'FU.ClassFeatureGadgetsRankBasic',
				advanced: 'FU.ClassFeatureGadgetsRankAdvanced',
				superior: 'FU.ClassFeatureGadgetsRankSuperior',
			},
			damageTypes: FU.damageTypes,
		};
	}

	/** @override */
	static getTabConfigurations() {
		return [
			{
				group: 'infusionTabs',
				navSelector: '.infusion-tabs',
				contentSelector: '.infusion-content',
				initial: 'description',
			},
		];
	}

	static activateListeners(html, item) {
		html.querySelectorAll('[data-action=addInfusion][data-rank]').forEach((el) => {
			el.addEventListener('click', (e) => {
				const rank = event.currentTarget.dataset.rank;
				item.update({
					[`system.data.${rank}`]: [...item.system.data[rank], {}],
				});
			});
		});
		html.querySelectorAll('[data-action=deleteInfusion][data-rank][data-index]').forEach((el) => {
			el.addEventListener('click', (event) => {
				const rank = event.currentTarget.dataset.rank;
				const idx = event.currentTarget.dataset.index;
				item.update({ [`system.data.${rank}`]: item.system.data[rank].toSpliced(idx, 1) });
			});
		});
	}

	static processUpdateData(data) {
		for (const rank of ['basicInfusions', 'advancedInfusions', 'superiorInfusions']) {
			let value = data[rank];
			if (value && !Array.isArray(value)) {
				data[rank] = Array.from(Object.values(value));
			}
		}
		return data;
	}
}
