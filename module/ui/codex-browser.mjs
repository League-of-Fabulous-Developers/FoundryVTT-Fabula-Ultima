import FoundryUtils from '../helpers/foundry-utils.mjs';
import { CodexDataModel, CodexEntryDataModel } from '../documents/actors/party/codex-data-model.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';
import { getSystemSetting, SETTINGS } from '../settings.js';
import { StringUtils } from '../helpers/string-utils.mjs';
import { FileUtils } from '../helpers/file-utils.mjs';

export class CodexBrowser {
	/** @type FUPartySheet **/
	sheet;
	/** @type FUActor **/
	actor;
	/** @type PartyDataModel **/
	party;

	/** @type RegExp **/
	#linkPattern;
	/** @type String[] **/
	selected;
	/** @type String **/
	filter;
	/** @type String[] **/
	enrichedDescriptions;

	static PROXY_ACTOR_NAME = 'Codex Entry Proxy';
	static UPLOAD_FILE_PREFIX = 'codex-entry';

	constructor(sheet) {
		this.sheet = sheet;
		this.selected = [];
		this.enrichedDescriptions = [];
		this.refresh(sheet.actor);
	}

	/**
	 * @param {HTMLElement} html
	 */
	attachListeners(html) {
		const toolbar = html.querySelector('.toolbar');
		const searchInput = toolbar.querySelector('.search').querySelector('input');
		if (searchInput) {
			requestAnimationFrame(() => searchInput.removeAttribute('disabled'));
			searchInput.addEventListener(
				'input',
				HTMLUtils.debounce(() => {
					const text = searchInput.value.toLowerCase() || '';
					this.filter = text;
					this.updateEntries();
				}, 150),
			);
		}

		html.querySelectorAll('.pfu-tag-selector .tag').forEach((tag) => {
			tag.addEventListener('click', () => {
				const value = tag.dataset.tag;

				if (this.selected.includes(value)) {
					this.selected = this.selected.filter((t) => t !== value);
					tag.classList.remove('active');
				} else {
					this.selected.push(value);
					tag.classList.add('active');
				}

				this.updateEntries();
			});
		});
	}

	/**
	 * @param context
	 * @returns {Promise<void>}
	 */
	async prepareContext(context) {
		context.browser = this;
		context.playingSounds = new Set(
			game.playlists.contents
				.flatMap((p) => p.sounds.contents)
				.filter((s) => s.playing)
				.map((s) => s.name),
		);
	}

	/**
	 * @param {FUActor} actor
	 * @param {HTMLElement} element
	 */
	refresh(actor, element) {
		this.actor = actor;
		this.party = actor.system;
		this.#linkPattern = undefined;
		if (element) {
			this.sortEntries(element);
		}
	}

	/**
	 * @param {HTMLElement} element
	 */
	sortEntries(element) {
		const entries = element.querySelector('.tab.codex .entries');
		if (entries) {
			const items = [...entries.querySelectorAll('li.entry')];
			items
				.sort((a, b) => {
					const indexA = Number(a.dataset.index);
					const indexB = Number(b.dataset.index);
					const entryA = this.party.codex.entries[indexA];
					const entryB = this.party.codex.entries[indexB];
					if (!entryA || !entryB) return 0;
					return entryA.name.localeCompare(entryB.name);
				})
				.forEach((li) => entries.appendChild(li));
		}
	}

	async resetTags() {
		const defaultCodexTags = CodexDataModel.getDefaultTags();
		const currentTags = FoundryUtils.safeClone(this.party.codex.tags);
		for (const tag of defaultCodexTags) {
			if (!currentTags.includes(tag)) {
				currentTags.push(tag);
			}
		}

		await this.actor.update({ [`system.codex.tags`]: currentTags });
	}

	async enrichDescriptions() {
		this.enrichedDescriptions.splice(0, this.enrichedDescriptions.length);
		for (const entry of this.party.codex.entries) {
			const ed = await this.#enrichEntryDescription(entry);
			this.enrichedDescriptions.push(ed);
		}
	}

	updateEntries() {
		const element = this.sheet.element;
		const entries = element.querySelector('.tab.codex .entries');
		if (entries) {
			const set = new Set(this.selected);
			const filter = this.filter ? this.filter.toLowerCase() : '';

			for (const li of entries.querySelectorAll('li.entry')) {
				const index = li.dataset.index;
				const entry = this.party.codex.entries[index];
				if (!entry) {
					return;
				}

				let visible = true;
				if (entry.hidden && !game.user.isGM) {
					visible = false;
				} else if (!entry.name.toLowerCase().includes(filter)) {
					visible = false;
				} else if (set.size > 0 && ![...set].every((tag) => entry.tags.includes(tag))) {
					visible = false;
				}

				li.classList.toggle('hidden', !visible);
			}
		}
	}

	/**
	 * @param {CodexEntryDataModel} entry
	 * @returns {Promise<String>}
	 */
	async #enrichEntryDescription(entry) {
		if (!entry.description) {
			return '';
		}
		const autoLinked = entry.description.replace(this.getCodexLinkPattern(), (match) => {
			if (match.toLowerCase() === entry.name.toLowerCase()) return match;
			return `@CODEX[${match}]`;
		});
		return await FoundryUtils.enrichText(autoLinked, {});
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	async handleContextAction(event, target) {
		const { type, index } = target.dataset;
		return this.executeCodexEntryAction(index, type);
	}

	/**
	 * @param {Number} index
	 * @param {String} type
	 * @returns {Promise<void>}
	 */
	async executeCodexEntryAction(index, type) {
		/** @type CodexEntryDataModel[] **/
		const entries = this.party.codex.entries;
		/** @type CodexEntryDataModel **/
		let entry = entries[index];
		if (!entry) {
			return;
		}
		switch (type) {
			case 'view':
				{
					await this.viewCodexEntry(entry);
				}
				break;

			case 'edit':
				{
					if (entry.toObject) {
						entry = entry.toObject();
					}
					entry = foundry.utils.deepClone(entry);
					const ok = await this.editCodexEntry(entry);
					if (ok) {
						entries[index] = entry;
						await this.actor.update({ [`system.codex.entries`]: entries });
					}
				}
				break;

			case 'send':
				{
					const enrichedDescription = await this.#enrichEntryDescription(entry);
					await this.#enrichEntryDescription(entry);
					const chatMessage = {
						content: await FoundryUtils.renderTemplate('chat/chat-codex-entry', {
							entry: entry,
							enrichedDescription,
						}),
					};
					await ChatMessage.create(chatMessage);
				}
				break;

			case 'display':
				FoundryUtils.popoutImage(entry.img, entry.name);
				break;

			case 'playSound':
				await entry.playSound();
				this.sheet.render(true);
				break;

			case 'stopSound':
				await entry.stopSound();
				this.sheet.render(true);
				break;

			case 'token':
				{
					if (entry.img === CodexEntryDataModel.DEFAULT_IMAGE_PATH) {
						ui.notifications.warn(`The codex entry is still using the default image.`);
						return;
					}
					let actor = game.actors.getName(CodexBrowser.PROXY_ACTOR_NAME);
					if (!actor) {
						actor = await Actor.implementation.create({
							name: CodexBrowser.PROXY_ACTOR_NAME,
							type: 'stash',
						});
					}
					const token = FoundryUtils.instantiateActor(
						actor,
						{
							name: entry.name,
							texture: {
								src: entry.img,
							},
						},
						true,
					);
					if (token) {
						ui.notifications.info(`Instanced a token for ${entry.name} on the active scene.`);
					} else {
						ui.notifications.error(`Failed to instance a token for the selected codex entry`);
					}
				}
				break;
		}
	}

	async revealCodexEntry(name) {
		const entry = this.party.codex.resolveEntry(name);
		if (entry) {
			await this.viewCodexEntry(entry);
		}
	}

	/**
	 * @param {CodexEntryDataModel} entry
	 * @returns {Promise<boolean>}
	 */
	async viewCodexEntry(entry) {
		const enrichedDescription = await this.#enrichEntryDescription(entry);
		const content = await FoundryUtils.renderTemplate('actor/party/actor-party-view-codex-entry', {
			entry: entry,
			enrichedDescription,
		});
		await FoundryUtils.popout(entry.name, content, {
			position: {},
		});
	}

	/**
	 * @returns {Promise<void>}
	 */
	async addCodexEntry() {
		/** @type CodexEntryDataModel[] **/
		const entries = this.party.codex.entries;
		/** @type CodexEntryDataModel **/
		let entry = {
			img: CodexEntryDataModel.DEFAULT_IMAGE_PATH,
			tags: [],
		};
		const ok = await this.editCodexEntry(entry);
		if (ok) {
			entries.push(entry);
			await this.actor.update({ [`system.codex.entries`]: entries });
		}
	}

	/**
	 * @param {FUActor} actor
	 * @returns {Promise<void>}
	 */
	async importActor(actor) {
		if (this.party.codex.resolveEntry(actor.name)) {
			ui.notifications.warn(`Failed to import actor ${actor.name} as there's already an entry with that name.`);
			return;
		}

		/** @type CodexEntryDataModel[] **/
		const entries = this.party.codex.entries;
		/** @type CodexEntryDataModel **/
		let entry = {
			name: actor.name,
			img: actor.img,
			description: actor.system?.description ?? '',
			tags: ['character'],
		};
		entries.push(entry);
		await this.actor.update({ [`system.codex.entries`]: entries });
	}

	/**
	 * @param {JournalEntryPageData} page
	 * @returns {Promise<void>}
	 */
	async importJournalEntryPage(page) {
		if (this.party.codex.resolveEntry(page.name)) {
			ui.notifications.warn(`Failed to import journal entry page ${page.name} as there's already an entry with that name.`);
			return;
		}

		/** @type CodexEntryDataModel[] **/
		const entries = this.party.codex.entries;
		/** @type CodexEntryDataModel **/
		let entry = {
			name: page.name,
			tags: [],
		};

		switch (page.type) {
			case 'image':
				if (page.src) {
					entry.img = page.src;
				}
				break;

			case 'text':
				if (page.text?.content) {
					entry.description = page.text.content;
				}
				break;
		}

		entries.push(entry);
		await this.actor.update({ [`system.codex.entries`]: entries });
	}

	/**
	 * @param {CodexEntryDataModel} entry
	 * @returns {Promise<boolean>}
	 */
	async editCodexEntry(entry) {
		const context = {
			entry,
			tags: this.party.codex.tags,
			audioChannels: Object.entries(CONST.AUDIO_CHANNELS).reduce((channels, [key, value]) => {
				channels[key] = game.i18n.localize(value);
				return channels;
			}, {}),
		};
		const content = await FoundryUtils.renderTemplate('actor/party/actor-party-edit-codex-entry', context);

		const result = await FoundryUtils.prompt({
			window: { title: `Edit — ${entry.name}` },
			position: {
				width: 750,
			},
			actions: {
				// Image Picker: Clipboard
				clipboardImage: async (event, target) => {
					const { name } = target.dataset;
					const imagePicker = event.currentTarget.querySelector('.image-picker');
					if (!imagePicker) {
						return;
					}
					const preview = imagePicker.querySelector('img');
					const input = imagePicker.querySelector(`input[name="${name}"]`);

					// Check if there's a valid upload directory
					// TODO: Get full path from whatever it stores here
					const uploadDirectory = getSystemSetting(SETTINGS.codexUploadDirectory);
					if (!uploadDirectory) {
						ui.notifications.warn(StringUtils.localize('FU.CodexUploadDirectoryMissing'));
						return;
					}

					const imagePath = await FileUtils.uploadClipboardImage(uploadDirectory, CodexBrowser.UPLOAD_FILE_PREFIX);
					if (!imagePath) {
						return;
					}

					// Update the preview and input
					preview.src = imagePath;
					input.value = imagePath;
				},
			},
			content,
			context,
			ok: {
				label: 'Save',
				callback: (event, button, dialog) => ({
					name: dialog.element.querySelector('[name="name"]').value.trim(),
					img: dialog.element.querySelector('[name="img"]').value.trim(),
					description: dialog.element.querySelector('[name="description"]').value.trim(),
					notes: dialog.element.querySelector('[name="notes"]').value.trim(),
					hidden: dialog.element.querySelector('[name="hidden"]').checked,

					audio: {
						path: dialog.element.querySelector('[name="audio.path"]').value.trim(),
						volume: parseFloat(dialog.element.querySelector('[name="audio.volume"]').value),
						channel: dialog.element.querySelector('[name="audio.channel"]').value.trim(),
						repeat: dialog.element.querySelector('[name="audio.repeat"]').checked,
					},
				}),
			},
		});

		if (!result) return false;
		if (!result.name) return false;

		entry.name = result.name;
		entry.img = result.img;
		entry.description = result.description;
		entry.hidden = result.hidden;
		entry.notes = result.notes;

		entry.audio = result.audio;

		return true;
	}

	async cleanCodexImages() {
		const uploadDirectory = getSystemSetting(SETTINGS.codexUploadDirectory);
		if (uploadDirectory) {
			const entries = this.party.codex.entries;
			const usedImages = new Set(entries.map((e) => e.img).filter((img) => img !== undefined));
			const filePattern = new RegExp(CodexBrowser.UPLOAD_FILE_PREFIX);

			// Browse the directory to get all files
			const browse = await FilePicker.browse('data', uploadDirectory);
			/** @type String[] **/
			const imagesToDelete = browse.files.filter((file) => {
				const filename = file.split('/').pop();
				return filePattern.test(filename) && !usedImages.has(file);
			});

			// TODO: Delete all images in the upload directory that match the file pattern and are not being used
			if (imagesToDelete.length > 0) {
				const confirm = await FoundryUtils.confirmDialog('Unused Images', `${imagesToDelete.length} uploaded images are unused:\n${imagesToDelete.join('\n')}`);
				if (confirm) {
					// // TODO: Delete the images
					// for (const file of imagesToDelete) {
					// 	await FileUtils.deleteFile('data', file);
					// }
					// ui.notifications.info(`Deleted ${imagesToDelete.length} unused images.`);
				}
			}
		}
	}

	/**
	 * @returns {RegExp}
	 */
	getCodexLinkPattern() {
		if (!this.#linkPattern) {
			const names = this.party.codex.entries
				.map((e) => e.name)
				.filter(Boolean)
				.sort((a, b) => b.length - a.length)
				.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

			this.#linkPattern = new RegExp(`\\b(${names.join('|')})\\b`, 'gi');
		}
		return this.#linkPattern;
	}
}
