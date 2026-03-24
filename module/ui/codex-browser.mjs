import FoundryUtils from '../helpers/foundry-utils.mjs';
import { CodexEntryDataModel } from '../documents/actors/party/codex-data-model.mjs';

export class CodexBrowser {
	/** @type FUPartySheet **/
	sheet;
	/** @type FUActor **/
	actor;
	/** @type PartyDataModel **/
	party;
	/** @type RegExp **/
	#codexLinkPattern;

	constructor(sheet) {
		this.sheet = sheet;
		this.refresh(sheet.actor);
	}

	/**
	 * @param {HTMLElement} html
	 */
	attachListeners(html) {}

	/**
	 * @param context
	 * @returns {Promise<void>}
	 */
	async prepareContext(context) {
		await Promise.all(
			this.party.codex.entries.map(async (entry) => {
				await this.#enrichCodexEntry(entry);
			}),
		);
	}

	refresh(actor) {
		this.actor = actor;
		this.party = actor.system;
		this.#codexLinkPattern = undefined;
	}

	/**
	 * @param {CodexEntryDataModel} entry
	 * @returns {Promise<void>}
	 */
	async #enrichCodexEntry(entry) {
		const autoLinked = entry.description.replace(this.getCodexLinkPattern(), (match) => {
			if (match.toLowerCase() === entry.name.toLowerCase()) return match;
			return `@CODEX[${match}]`;
		});
		entry.enrichedDescription = await FoundryUtils.enrichText(autoLinked, {});
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	async handleContextAction(event, target) {
		const { type, index } = target.dataset;
		/** @type CodexEntryDataModel[] **/
		const entries = this.party.codex.entries;
		/** @type CodexEntryDataModel **/
		let entry = entries[index];
		if (!entry) {
			return;
		}
		if (entry.toObject) {
			entry = entry.toObject();
		}
		entry = foundry.utils.deepClone(entry);

		switch (type) {
			case 'view':
				{
					await this.viewCodexEntry(entry);
				}
				break;

			case 'edit':
				{
					const ok = await this.editCodexEntry(entry);
					if (ok) {
						entries[index] = entry;
						await this.actor.update({ [`system.codex.entries`]: entries });
					}
				}
				break;

			case 'send':
				{
					await this.#enrichCodexEntry(entry);
					const chatMessage = {
						content: await FoundryUtils.renderTemplate('chat/chat-codex-entry', {
							entry: entry,
						}),
					};
					await ChatMessage.create(chatMessage);
				}
				break;

			case 'display':
				FoundryUtils.popoutImage(entry.img, entry.name);
				break;
		}
	}

	/**
	 * @param {CodexEntryDataModel} entry
	 * @returns {Promise<boolean>}
	 */
	async viewCodexEntry(entry) {
		await this.#enrichCodexEntry(entry);
		const content = await FoundryUtils.renderTemplate('actor/party/actor-party-view-codex-entry', {
			entry: entry,
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
	 * @param {CodexEntryDataModel} entry
	 * @returns {Promise<boolean>}
	 */
	async editCodexEntry(entry) {
		const context = {
			entry,
			tags: this.party.codex.tags,
		};
		const content = await FoundryUtils.renderTemplate('actor/party/actor-party-edit-codex-entry', context);

		const result = await FoundryUtils.prompt({
			window: { title: `Edit — ${entry.name}` },
			position: {
				width: 600,
			},
			content,
			context,
			ok: {
				label: 'Save',
				callback: (event, button, dialog) => ({
					name: dialog.element.querySelector('[name="name"]').value.trim(),
					img: dialog.element.querySelector('[name="img"]').value.trim(),
					description: dialog.element.querySelector('[name="description"]').value.trim(),
				}),
			},
		});

		if (!result) return false;
		if (!result.name) return false;

		entry.name = result.name;
		entry.img = result.img;
		entry.description = result.description;
		return true;
	}

	/**
	 * @returns {RegExp}
	 */
	getCodexLinkPattern() {
		if (!this.#codexLinkPattern) {
			const names = this.party.codex.entries
				.map((e) => e.name)
				.filter(Boolean)
				.sort((a, b) => b.length - a.length)
				.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

			this.#codexLinkPattern = new RegExp(`\\b(${names.join('|')})\\b`, 'gi');
		}
		return this.#codexLinkPattern;
	}
}
