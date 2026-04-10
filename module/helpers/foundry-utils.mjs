import { StringUtils } from './string-utils.mjs';
import { systemTemplatePath } from './system-utils.mjs';
import { TextEditor } from './text-editor.mjs';
import { CompendiumIndex } from '../ui/compendium/compendium-index.mjs';
import { ObjectUtils } from './object-utils.mjs';
import { ItemSelectionDialog } from '../ui/features/item-selection-dialog.mjs';

const { api, fields, handlebars } = foundry.applications;

/**
 * @typedef FormSelectOption
 * @property {string} [value]
 * @property {string} [label]
 * @property {string} [group]
 * @property {boolean} [disabled]
 * @property {boolean} [selected]
 * @property {boolean} [rule]
 * @property {String} img (Custom for PFU dialogs)
 * @property {Record<string, string>} [dataset]
 */

/**
 * @callback DialogV2ButtonCallback
 * @param {PointerEvent|SubmitEvent} event        The button click event, or a form submission event if the dialog was
 *                                                submitted via keyboard.
 * @param {HTMLButtonElement} button              If the form was submitted via keyboard, this will be the default
 *                                                button, otherwise the button that was clicked.
 * @param {DialogV2} dialog                       The DialogV2 instance.
 * @returns {Promise<any>}
 */

/**
 * @typedef DialogV2Button
 * @property {string} action                      The button action identifier.
 * @property {string} label                       The button label. Will be localized.
 * @property {string} [icon]                      FontAwesome icon classes.
 * @property {string} [class]                     CSS classes to apply to the button.
 * @property {Record<string, string>} [style]     CSS style to apply to the button.
 * @property {string} [type="submit"]             The button type.
 * @property {boolean} [disabled]                 Whether the button is disabled
 * @property {boolean} [default]                  Whether this button represents the default action to take if the user
 *                                                submits the form without pressing a button, i.e. with an Enter
 *                                                keypress.
 * @property {DialogV2ButtonCallback} [callback]  A function to invoke when the button is clicked. The value returned
 *                                                from this function will be used as the dialog's submitted value.
 *                                                Otherwise, the button's identifier is used.
 */

/**
 * @typedef SelectInputConfig
 * @property {FormSelectOption[]} options
 * @property {string[]} [groups]        An option to control the order and display of optgroup elements. The order of
 *                                      strings defines the displayed order of optgroup elements.
 *                                      A blank string may be used to define the position of ungrouped options.
 *                                      If not defined, the order of groups corresponds to the order of options.
 * @property {string} [blank]
 * @property {string} [valueAttr]       An alternative value key of the object passed to the options array
 * @property {string} [labelAttr]       An alternative label key of the object passed to the options array
 * @property {boolean} [localize=false] Localize value labels
 * @property {boolean} [sort=false]     Sort options alphabetically by label within groups
 * @property {"single"|"multi"|"checkboxes"} [type] Customize the type of select that is created
 */

/**
 * @typedef FUSelectDialogConfiguration
 * @property {String} selected
 * @property {String} message
 */

/**
 * @typedef FUDialogContentSection
 * @property {String} title
 * @property {String} text
 */

/**
 * @typedef FUPromptOptions
 * @property {String} title
 * @property {Object} context An object to use for certain supported actions
 */

/**
 * @remarks Helper usage examples can also be found here: https://foundryvtt.wiki/en/development/api/helpers
 */
export default class FoundryUtils {
	/**
	 * @param {String} title
	 * @param content
	 * @param {Object} options
	 * @returns {Promise<*>}
	 */
	static async input(title, content, options = {}) {
		let defaultOptions = {
			window: { title: title, icon: 'fas fa-comment' },
			content: content,
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			rejectClose: false,
			ok: {
				label: 'FU.Confirm',
			},
		};
		ObjectUtils.mergeRecursive(defaultOptions, options);
		return await foundry.applications.api.DialogV2.input(defaultOptions);
	}

	/**
	 * @param {String} title
	 * @param {String} content
	 * @param {Object} options
	 * @returns {Promise}
	 */
	static async popout(title, content, options = {}) {
		const [mergedOptions] = ObjectUtils.mergeRecursive(
			{
				window: { title, icon: 'fas fa-eye', resizable: true },
				classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
				rejectClose: false,
				content,
				buttons: [{ label: 'Close', action: 'close' }],
			},
			options,
		);
		await foundry.applications.api.DialogV2.wait(mergedOptions);
	}

	/**
	 * @param options
	 * @returns {Promise<*>}
	 */
	static async prompt(options = {}) {
		const [result] = ObjectUtils.mergeRecursive(
			{
				window: { icon: 'fas fa-comment' },
				classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
				rejectClose: false,
				actions: {
					// Image Picker: Browse
					browseImage: (event, target) => {
						const { name } = target.dataset;
						const imagePicker = event.currentTarget.querySelector('.image-picker');
						if (!imagePicker) {
							return;
						}
						const preview = imagePicker.querySelector('img');
						const input = imagePicker.querySelector(`input[name="${name}"]`);
						new FilePicker({
							type: 'image',
							current: input?.value,
							callback: (path) => {
								if (input) {
									input.value = path;
									preview.src = path;
								}
							},
						}).render(true);
					},
					// Generic File
					browse: (event, target, dialog) => {
						const { name, type } = target.dataset;
						const input = event.currentTarget.querySelector(`input[name="${name}"]`);
						new FilePicker({
							type: type,
							current: input?.value,
							callback: (path) => {
								if (input) input.value = path;
							},
						}).render(true);
					},
					toggleTag: (event, target) => {
						if (!options.context) {
							return;
						}
						const { path, tag } = target.dataset;
						const tags = ObjectUtils.getProperty(options.context, path);
						if (!tags) {
							return;
						}

						const index = tags.indexOf(tag);
						if (index === -1) {
							tags.push(tag);
							target.classList.add('active');
						} else {
							tags.splice(index, 1);
							target.classList.remove('active');
						}
					},
				},
			},
			options,
		);

		return await foundry.applications.api.DialogV2.input(result);
	}

	/**
	 * @param {String} title
	 * @param {FormSelectOption[]} options
	 * @param {string} [selected] the default selected value
	 * @returns {Promise<String|null>} The single selected option
	 */
	static async selectOptionDialog(title, options, selected) {
		const selectInput = fields.createSelectInput({
			options: options,
			name: 'option',
			type: 'checkboxes',
			value: selected,
		});

		const selectGroup = fields.createFormGroup({
			input: selectInput,
			label: 'Option',
		});

		const content = `${selectGroup.outerHTML}`;

		const data = await api.DialogV2.input({
			window: { title: title, icon: 'fas fa-comment' },
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			content: content,
		});
		return data?.option ?? null;
	}

	/**
	 * Show a dialog using radio buttons with optional icons.
	 *
	 * @param {String} title
	 * @param {{ value: string, label: string, icon?: string }[]} options
	 * @param {FUSelectDialogConfiguration} configuration
	 * @returns {Promise<String|null>}
	 */
	static async selectIconOptionDialog(title, options, configuration = {}) {
		const content = await FoundryUtils.renderTemplate('dialog/dialog-select-option-icon', {
			options: options,
			message: configuration.message,
		});

		// TODO: Set initial selected
		const data = await api.DialogV2.input({
			window: { title: title },
			actions: {
				/** @param {Event} event
				 *  @param {HTMLElement} dialog **/
				selectOption: (event, dialog) => {
					const value = event.target.dataset.value;
					const parent = dialog.closest('div');
					const option = parent.querySelector("input[name='option']");
					option.value = value;
					parent.querySelectorAll('button').forEach((button) => {
						button.classList.remove('selected');
					});
					dialog.classList.add('selected');
				},
			},
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			content: content,
		});

		return data?.option ?? null;
	}

	/**
	 * @remarks This follows the 'key:value' format used in the system's CONFIG file
	 * @param {string[]} keys
	 * @param {Record<string, string>} labelRecord
	 * @param {Record<string, string>} iconRecord
	 * @returns {FormSelectOption[]}
	 */
	static generateConfigIconOptions(keys, labelRecord, iconRecord) {
		return Array.from(keys).map((key) => ({
			label: StringUtils.localize(labelRecord[key]),
			icon: iconRecord[key],
			value: key,
		}));
	}

	/**
	 * @param {Object} typeObject
	 * @returns {FormSelectOption[]}
	 * @remarks This follows the 'key:value' format used in the system's CONFIG file
	 */
	static generateConfigOptions(typeObject) {
		const options = Object.entries(typeObject).map(([key, value]) => ({
			label: StringUtils.localize(value),
			value: key,
		}));
		return options;
	}

	/**
	 * @param obj1
	 * @param obj2
	 * @returns {boolean} If they have the same keys
	 */
	static haveSameKeys(obj1, obj2) {
		const keys1 = Object.keys(obj1).sort();
		const keys2 = Object.keys(obj2).sort();
		return JSON.stringify(keys1) === JSON.stringify(keys2);
	}

	/**
	 * @param {String} templatePath The path relative to the system's templates directory
	 * @param {Object} context Used by the template
	 * @returns {Promise<*>}
	 */
	static async renderTemplate(templatePath, context) {
		return await handlebars.renderTemplate(systemTemplatePath(templatePath), context);
	}

	/**
	 * @typedef LabelFunction
	 * @template T
	 * @param {T} object
	 * @returns String
	 */

	/**
	 * @template T
	 * @param {string} title - Dialog title
	 * @param {T[]} options - Array of elements to choose from
	 * @param {LabelFunction<T>} getLabel
	 * @returns {Promise<string|null>} - Selected string or null if cancelled
	 */
	static async promptRadioChoice(title, options, getLabel) {
		const context = {
			choices: await Promise.all(
				options.map(async (opt) => {
					const label = getLabel(opt);
					const enrichedLabel = await TextEditor.enrichHTML(label);
					return {
						label: enrichedLabel,
						element: opt,
					};
				}),
			),
		};
		const content = await handlebars.renderTemplate(systemTemplatePath('dialog/dialog-selection-radio'), context);
		const result = await api.DialogV2.input({
			window: { title: title, icon: 'fas fa-question-circle' },
			label: game.i18n.localize('FU.Submit'),
			rejectClose: false,
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			content: content,
			ok: {
				label: 'FU.Confirm',
			},
		});

		if (result && result.index) {
			return options[result.index];
		} else {
			return null;
		}
	}

	/**
	 * @param {String} title
	 * @param {String[]} options
	 * @returns {Promise<string|null>}
	 */
	static async promptStringRadioChoice(title, options) {
		return this.promptRadioChoice(title, options, (opt) => opt);
	}

	/**
	 * @param {Object} options
	 * @param {string} options.title
	 * @param {string} options.content
	 * @param {DialogV2Button[]} options.buttons
	 * @returns {Promise<string|null>}
	 */
	static async promptActionChoice({ title, content, buttons }) {
		const result = await foundry.applications.api.DialogV2.wait({
			window: {
				title,
				icon: 'fas fa-square-up-right',
			},
			position: {
				width: 500,
			},
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			content,
			buttons,
		});
		return result ?? null;
	}

	/**
	 * @param {Object} options
	 * @param {string} options.title
	 * @param {FUDialogContentSection[]} options.sections
	 * @param {DialogV2Button[]} options.buttons
	 * @param {FUActor} options.actor
	 * @param {FUItem} options.item
	 * @returns {Promise<string|null>}
	 */
	static async promptChoiceSections({ title, sections, buttons, actor, item }) {
		const result = await foundry.applications.api.DialogV2.wait({
			window: {
				title,
				icon: 'fas fa-square-up-right',
				resizable: true,
			},
			position: {
				width: 225 * sections.length,
			},
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			content: await FoundryUtils.renderTemplate('dialog/dialog-layout', {
				sections: sections,
			}),
			buttons,
			actions: {
				sendToChat: async (event, dialog) => {
					const text = dialog.dataset.text;
					const title = dialog.dataset.title;
					const flavor = await FoundryUtils.renderTemplate('chat/chat-check-flavor-item-v2', {
						subtitle: title,
						item: item,
					});
					const speaker = FoundryUtils.resolveSpeaker(actor);
					const chatMessage = {
						speaker: speaker,
						flavor: flavor,
						content: await FoundryUtils.renderTemplate('chat/chat-description-v2', {
							description: text,
						}),
					};
					return ChatMessage.create(chatMessage);
				},
			},
		});
		return result ?? null;
	}

	/**
	 * @param {String} title
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @param {DialogV2Button[]} buttons
	 * @param {String} description
	 * @param {String} message
	 * @returns {Promise<string|null>}
	 */
	static async promptItemChoice({ title, actor, item, buttons, description, message }) {
		if (description) {
			description = await FoundryUtils.enrichText(description, {
				relativeTo: actor,
			});
		}
		const content = await this.renderTemplate('dialog/dialog-item-prompt', {
			item: item,
			description: description,
			message: message,
		});
		const action = await FoundryUtils.promptActionChoice({ title, content, buttons });
		return action ?? null;
	}

	/**
	 * @param {String} title
	 * @param {String} message
	 * @returns {Promise<Boolean>}
	 */
	static async confirmDialog(title, message) {
		return foundry.applications.api.DialogV2.confirm({
			window: {
				title: title,
				icon: 'fas fa-comment',
			},
			classes: ['projectfu', 'sheet', 'backgroundstyle'],
			content: await this.renderTemplate('dialog/dialog-common', {
				message: message,
			}),
			rejectClose: false,
			yes: {
				label: 'FU.Confirm',
			},
			no: {
				label: 'FU.Cancel',
			},
		});
	}

	/**
	 * @param {String} title
	 * @param {String} content
	 * @returns {Promise<Boolean>}
	 */
	static async confirm(title, content) {
		return foundry.applications.api.DialogV2.confirm({
			window: {
				title: title,
			},
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			content: content,
			rejectClose: false,
			yes: {
				label: 'FU.Confirm',
			},
			no: {
				label: 'FU.Cancel',
			},
		});
	}

	/**
	 * @param {Record<String, String>} record
	 * @param {((key: string, value: string) => string)} labelSelector
	 * @returns {{label: *, value: *}[]}
	 * @remarks Maps the localized values (by convention) as the labels, and the keys as the values.
	 */
	static getFormOptions(record, labelSelector = undefined) {
		return Object.entries(record).map(([key, value]) => ({
			label: StringUtils.localize(labelSelector ? labelSelector(key, value) : value),
			value: key,
		}));
	}

	/**
	 * @typedef EnrichmentOptions
	 * @property {boolean} [secrets=false]      Include unrevealed secret tags in the final HTML? If false, unrevealed
	 *                                          secret blocks will be removed.
	 * @property {boolean} [documents=true]     Replace dynamic document links?
	 * @property {boolean} [links=true]         Replace hyperlink content?
	 * @property {boolean} [rolls=true]         Replace inline dice rolls?
	 * @property {boolean} [embeds=true]        Replace embedded content?
	 * @property {boolean} [custom=true]        Apply custom enrichers?
	 * @property {object|Function} [rollData]   The data object providing context for inline rolls, or a function that
	 *                                          produces it.
	 * @property {ClientDocument} [relativeTo]  A document to resolve relative UUIDs against.
	 */

	/**
	 * @param {String} text
	 * @param {EnrichmentOptions} options
	 * @returns {Promise<string>}
	 */
	static async enrichText(text, options) {
		return TextEditor.implementation.enrichHTML(text, options);
	}

	/**
	 * @param {String} str
	 * @return {Boolean}
	 */
	static isUUID(str) {
		if (typeof str !== 'string') return false;

		return /^(?:Compendium\.[^.\s]+\.[^.\s]+\.)?(?:[A-Za-z]+\.)?[A-Za-z0-9]{16}(?:\.[A-Za-z]+\.[A-Za-z0-9]{16})*$/.test(str);
	}

	/**
	 * @typedef ItemMigrationAction
	 * @property {Promise} procedure
	 * @property {FUItem} item
	 * @property {FUItem} compendiumItem
	 */

	/**
	 * @param {FUItem[]} items
	 * @returns {Promise<ItemMigrationAction[]>}
	 */
	static async getItemMigrationActions(items) {
		/** @type ItemMigrationAction[] **/
		const updates = [];
		for (const item of items) {
			if (item.system.fuid && item.system.fuid !== '') {
				const compendiumEntry = await CompendiumIndex.instance.getItemByFuid(item.system.fuid);
				if (!compendiumEntry) {
					continue;
				}
				const compendiumItem = await fromUuid(compendiumEntry.uuid);
				if (!compendiumItem) {
					continue;
				}
				const procedure = async () => {
					await FoundryUtils.migrateItem(compendiumItem, item);
				};
				updates.push({
					item: item,
					compendiumItem: compendiumItem,
					procedure,
				});
			}
		}
		return updates;
	}

	/**
	 * @param {HTMLElement} target
	 * @returns {Object}
	 */
	static getFormData(target) {
		const form = target.closest('form');
		// eslint-disable-next-line no-undef
		const formData = new FormDataExtended(form);
		return foundry.utils.expandObject(formData.object);
	}

	/**
	 * @param {*} data
	 * @returns {Object}
	 */
	static safeClone(data) {
		if (data?.toObject instanceof Function) return data.toObject();
		return foundry.utils.deepClone(data);
	}

	/**
	 * @param {FUActor} actor
	 * @returns {*}
	 */
	static resolveSpeaker(actor) {
		let speaker = ChatMessage.getSpeaker({ actor });
		if (speaker.scene && speaker.token) {
			const token = game.scenes.get(speaker.scene)?.tokens?.get(speaker.token);
			if (token) {
				speaker = ChatMessage.getSpeaker({ token });
			}
		}
		return speaker;
	}

	/**
	 * @param {String} src
	 * @param {String} title
	 * @param {String} uuid
	 */
	static popoutImage(src, title, uuid = undefined) {
		// eslint-disable-next-line no-undef
		const popout = new ImagePopout(src, {
			title: title,
			uuid: uuid,
		});
		popout.render(true);
	}

	/**
	 * @callback ContextMenuCallback
	 * @param {HTMLElement} target                          The element that the context menu has been triggered for.
	 * @returns {unknown}
	 */

	/**
	 * @typedef ContextMenuEntry
	 * @property {string} name                              The context menu label. Can be localized.
	 * @property {string} [icon]                            A string containing an HTML icon element for the menu item.
	 * @property {string} [classes]                         Additional CSS classes to apply to this menu item.
	 * @property {string} [group]                           An identifier for a group this entry belongs to.
	 * @property {ContextMenuJQueryCallback} callback       The function to call when the menu item is clicked.
	 * @property {ContextMenuCondition|boolean} [condition] A function to call or boolean value to determine if this entry
	 *                                                      appears in the menu.
	 */

	/**
	 * @typedef {'click'|'contextmenu'|'pointerdown'|'pointermove'|'mouseover'} ContextMenuEventName
	 */

	/**
	 * @typedef ContextMenuOptions
	 * @property {ContextMenuEventName} [eventName="contextmenu"] Optionally override the triggering event which can spawn the menu. If
	 *                                              the menu is using fixed positioning, this event must be a MouseEvent.
	 * @property {ContextMenuCallback} [onOpen]     A function to call when the context menu is opened.
	 * @property {ContextMenuCallback} [onClose]    A function to call when the context menu is closed.
	 * @property {boolean} [fixed=false]            If true, the context menu is given a fixed position rather than being
	 *                                              injected into the target.
	 * @property {boolean} [jQuery=true]            If true, callbacks will be passed jQuery objects instead of HTMLElement
	 *                                              instances.
	 */

	/**
	 * @param html
	 * @param className
	 * @param {ContextMenuEventName} eventName
	 * @param {ContextMenuEntry[]} entries
	 */
	static contextMenu(html, className, entries, eventName = 'contextmenu') {
		new foundry.applications.ux.ContextMenu(html, className, entries, {
			eventName: eventName,
			fixed: true,
			jQuery: false,
		});
	}

	/**
	 * @param {HTMLElement} html
	 * @param {String} className
	 * @param {FUItem[]} items
	 * @param {function(FUItem): Promise<void>} [action]
	 * @remarks {Boolean} True if the context menu was set.
	 */
	static itemContextMenu(html, className, items, action = undefined) {
		const entries = items
			.toSorted((a, b) => a.name.localeCompare(b.name))
			.map((item) => {
				return {
					name: item.name,
					icon: `<img class="fu-icon--xs" src="${item.img}" alt="${item.name}"/>`,
					callback: async (html) => {
						if (action) {
							return action(item);
						}
						if (item.roll) {
							return item.roll();
						}
					},
				};
			});

		if (entries.length === 0) {
			html.querySelectorAll(className).forEach((el) => {
				el.addEventListener(
					'click',
					() => {
						ui.notifications.warn(StringUtils.localize('FU.DialogEntriesMissing'));
					},
					{ once: true },
				);
			});
			return false;
		}

		new foundry.applications.ux.ContextMenu(html, className, entries, {
			eventName: 'click',
			fixed: true,
			jQuery: false,
		});

		return true;
	}

	/**
	 * @returns {Promise<JournalEntryData[]>}
	 */
	static async selectJournalEntries() {
		const journals = game.journal.contents;
		if (!journals.length) {
			ui.notifications.warn('No journal entries found in this world.');
			return;
		}

		const title = `${StringUtils.localize('CONTROLS.CommonSelect')} ${StringUtils.localize('DOCUMENT.JournalEntry')}`;

		const data = {
			title: title,
			style: 'list',
			items: journals,
			getDescription: async (item) => {
				const text = item.name ?? '';
				return text;
			},
		};
		const dialog = new ItemSelectionDialog(data);
		return await dialog.open();
	}

	/**
	 * @returns {Promise<FUActor[]>}
	 */
	static async selectActors() {
		const actors = game.actors.contents;
		if (!actors.length) {
			ui.notifications.warn('No actors found in this world.');
			return;
		}
		const title = `${StringUtils.localize('CONTROLS.CommonSelect')} ${StringUtils.localize('DOCUMENT.Actor')}`;

		const data = {
			title: title,
			style: 'list',
			items: actors,
			getDescription: async (item) => {
				const text = item.name ?? '';
				return text;
			},
		};
		const dialog = new ItemSelectionDialog(data);
		const result = await dialog.open();
		return result;
	}

	/**
	 * @desc Migrates the data of an item onto another.
	 * @param {FUItem} sourceItem
	 * @param {FUItem} targetItem
	 * @returns {Promise}
	 * @async
	 */
	static async migrateItem(sourceItem, targetItem) {
		// Gather retained data model properties
		const retainedFields = {};
		for (const fieldPath of targetItem.system.retainedFieldPaths) {
			const systemPath = `system.${fieldPath}`;
			const fieldValue = ObjectUtils.getProperty(targetItem, systemPath);
			if (fieldValue !== undefined) {
				retainedFields[systemPath] = fieldValue;
			}
		}

		// Properties
		await targetItem.update(
			{
				name: sourceItem.name,
				img: sourceItem.img,
				system: foundry.utils.deepClone(sourceItem.system),
				flags: foundry.utils.deepClone(sourceItem.flags),
			},
			{ diff: false },
		);

		// After the deep clone, apply them again.
		await targetItem.update(retainedFields);

		// Effects
		const updates = [];
		const creates = [];

		const targetEffectsByLabel = new Map(targetItem.effects.map((e) => [e.label, e]));
		for (const sourceEffect of sourceItem.effects) {
			const data = foundry.utils.deepClone(sourceEffect.toObject());

			// Never reuse IDs or origins
			delete data._id;
			delete data.origin;

			const targetEffect = targetEffectsByLabel.get(sourceEffect.label);
			if (targetEffect) {
				updates.push({
					_id: targetEffect.id,
					changes: data.changes,
					duration: data.duration,
					flags: data.flags,
					disabled: data.disabled,
					system: foundry.utils.deepClone(sourceEffect.system),
				});
			} else {
				creates.push(data);
			}
		}

		if (updates.length) {
			await targetItem.updateEmbeddedDocuments('ActiveEffect', updates);
		}

		if (creates.length) {
			await targetItem.createEmbeddedDocuments('ActiveEffect', creates);
		}
	}

	static PLACEHOLDER_IMG = 'icons/svg/mystery-man.svg';

	/**
	 * @desc Instantiates an actor on the current scene, prompting the user to click where to place it.
	 * @param {FUActor} actor
	 * @param {Object} data
	 * @returns {TokenDocument|null}
	 */
	static async instantiateActor(actor, data) {
		const scene = game.scenes.viewed;
		if (!scene) {
			return null;
		}

		const gridSize = scene.grid.size;
		const tokenData = await actor.getTokenDocument({
			x: 0,
			y: 0,
			actorLink: false,
		});
		const tokenSize = tokenData.width;

		const notification = ui.notifications.info('Left click to place the token on the active scene, right click to cancel the operation.', { permanent: true });

		const position = await new Promise((resolve) => {
			const clickHandler = (event) => {
				const { x, y } = event.getLocalPosition(canvas.stage);
				cleanup();
				resolve({ x, y });
			};

			const rightClickHandler = () => {
				cleanup();
				ui.notifications.warn('Cancelled token placement.');
				resolve(null);
			};

			const cleanup = () => {
				canvas.stage.off('click', clickHandler);
				canvas.stage.off('rightclick', rightClickHandler);
				ui.notifications.remove(notification);
			};

			canvas.stage.on('click', clickHandler);
			canvas.stage.on('rightclick', rightClickHandler);
		});

		if (!position) {
			return null; // cancelled
		}

		const snapped = scene.grid.getSnappedPoint({
			x: position.x - (tokenSize * gridSize) / 2,
			y: position.y - (tokenSize * gridSize) / 2,
		});

		const [tokenDocument] = await scene.createEmbeddedDocuments('Token', [
			{
				...tokenData.toObject(),
				x: snapped.x,
				y: snapped.y,
				...data,
			},
		]);
		return tokenDocument;
	}

	/**
	 * @param imagePath
	 * @returns {Promise<Tile>}
	 */
	static async placeTile(imagePath) {
		const scene = game.scenes.viewed;

		// Get image dimensions to use as default tile size
		// eslint-disable-next-line no-undef
		const tex = await loadTexture(imagePath);
		let width, height;

		const promptTitle = `${StringUtils.localize('CONTROLS.TilePlace')} - Preset`;
		const preset = await FoundryUtils.selectOptionDialog(promptTitle, [
			{
				label: StringUtils.localizeMultiple(['Token', 'Scale']),
				value: 'token',
			},
			{
				label: StringUtils.localizeMultiple(['Default', 'Scale']),
				value: 'default',
			},
		]);
		switch (preset) {
			case 'token':
				{
					const scale = Math.min(100 / tex.width, 100 / tex.height);
					width = tex.width * scale;
					height = tex.height * scale;
				}
				break;
			case 'default':
				width = tex.width;
				height = tex.height;
				break;
		}

		if (!preset) {
			return;
		}

		const notification = ui.notifications.info('Left click to place tile on the active scene, right click to cancel the operation.', { permanent: true });

		return new Promise((resolve) => {
			const clickHandler = async (event) => {
				const { x, y } = event.getLocalPosition(canvas.stage);

				cleanup();

				const [tileDocument] = await scene.createEmbeddedDocuments('Tile', [
					{
						texture: { src: imagePath },
						width,
						height,
						x: x - width / 2,
						y: y - height / 2,
					},
				]);

				canvas.tiles.releaseAll();
				resolve(tileDocument);
			};

			const rightClickHandler = () => {
				cleanup();
				ui.notifications.warn('Cancelled tile placement.');
				resolve(null); // cancelled
			};

			const cleanup = () => {
				canvas.stage.off('click', clickHandler);
				canvas.stage.off('rightclick', rightClickHandler);
				ui.notifications.remove(notification);
			};

			canvas.stage.on('click', clickHandler);
			canvas.stage.on('rightclick', rightClickHandler);
		});
	}

	/**
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @returns {Promise<FUItem>}
	 */
	static async addItemToActor(actor, item) {
		const [createdItem] = await actor.createEmbeddedDocuments('Item', [item.toObject()]);
		return createdItem;
	}
}
