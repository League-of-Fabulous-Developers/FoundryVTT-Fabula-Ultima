import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { SystemControls } from '../helpers/system-controls.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { Flags } from '../helpers/flags.mjs';
import { MetaCurrencyTrackerApplication } from '../ui/metacurrency/MetaCurrencyTrackerApplication.mjs';

export const FUPartySheetHelper = Object.freeze({
	openActive,
	getActiveModel,
});

/**
 * @description Creates a sheet that contains the details of a party composed of {@linkcode FUActor}
 * @property {FUActor} actor
 * @property {PartyDataModel} actor.system
 * @property {PartySheetActionHook[]} actionHooks
 * @extends {ActorSheet}
 */
export class FUPartySheet extends ActorSheet {
	static get defaultOptions() {
		const defaultOptions = super.defaultOptions;
		return foundry.utils.mergeObject(defaultOptions, {
			classes: ['projectfu', 'sheet', 'actor', 'party', 'backgroundstyle'],
			template: 'systems/projectfu/templates/actor/actor-party-sheet.hbs',
			width: 920,
			height: 1000,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'overview',
				},
			],
			scrollY: ['.sheet-body'],
			dragDrop: [{ dragSelector: '.item-list .item, .effects-list .effect', dropSelector: null }],
		});
	}

	/**
	 * @returns {PartyDataModel}
	 */
	get party() {
		return this.actor.system;
	}

	/** @override */
	async getData() {
		// Enrich or transform data here
		const context = super.getData();
		context.actionHooks = FUPartySheet.prepareActionHooks();
		await ActorSheetUtils.prepareData(context, this);
		context.characters = this.party.characterData;
		context.characterCount = this.party.characters.size;
		// TODO: Set expanded data
		return context;
	}

	/** @override */
	get template() {
		return `systems/projectfu/templates/actor/actor-party-sheet.hbs`;
	}

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);
		ActorSheetUtils.activateDefaultListeners(html, this);
		ActorSheetUtils.activateInventoryListeners(html, this);
		ActorSheetUtils.activateStashListeners(html, this);
		html.find('[data-action=revealActor]').on('click', (ev) => {
			const uuid = ev.currentTarget.dataset.actor;
			const actor = fromUuidSync(uuid);
			actor.sheet.render(true);
		});
		this.setupCharacterContextMenu(html);
		// Set party as active
		html.find('.set-active-button').click(() => {
			console.debug(`Setting ${this.actor.name} as the active party`);
			game.settings.set(Flags.Scope, SETTINGS.activeParty, this.actor._id);
		});
		// Reveal meta currency tracker
		html.find('[data-action=revealMetaCurrency]').on('click', (ev) => {
			MetaCurrencyTrackerApplication.renderApp();
		});
		// Rest whole party
		html.find('[data-action=restParty]').on('click', async (ev) => {
			for (const actor of this.party.characterActors) {
				await actor.sheet.onRest(actor);
				this.render(true);
			}
		});
		// Refresh Sheet
		html.find('[data-action=refreshSheet]').on('click', (ev) => {
			this.render(true);
		});
		// Custom Hook
		html.find('[data-action=callHook]').on('click', (ev) => {
			const hook = ev.currentTarget.dataset.option;
			Hooks.call(hook);
		});
		// Add a progress track
		html.find('[data-action=addTrack]').on('click', (ev) => {
			this.promptAddTrack();
		});
	}

	/** @override */
	async _onDrop(ev) {
		ev.preventDefault();
		// Retrieve drag data using TextEditor
		const data = TextEditor.getDragEventData(ev);
		if (data && data.type) {
			switch (data.type) {
				case 'Item': {
					const accepted = await ActorSheetUtils.handleInventoryItemDrop(this.actor, data, super._onDrop(ev));
					if (accepted) {
						return true;
					}
					break;
				}

				case 'Actor': {
					const actor = await Actor.implementation.fromDropData(data);
					console.debug(`${actor.name} was dropped onto party sheet`);
					await this.addCharacter(actor);
					return true;
				}
			}
		}

		// TODO: Reject invalid items
		ui.notifications.warn('FU.SheetInvalidItem', { localize: true });
		return false;
	}

	/**
	 * @param {FUActor} actor
	 * @returns {Promise<void>}
	 */
	async addCharacter(actor) {
		if (actor.type !== 'character') {
			console.warn(`${actor.name} is not a player character!`);
			return;
		}

		const characters = this.party.characters;
		characters.add(actor.uuid);
		this.actor.update({ ['system.characters']: characters });
		console.debug(`${actor.name} was added to the party ${this.actor.name}`);
	}

	/**
	 * @description Adds a new progress track
	 */
	promptAddTrack() {
		console.debug('Adding a progress track');
		new Dialog({
			title: 'Progress Track',
			content: 'This feature is currently a work in progress.',
			buttons: [
				{
					label: 'How dare you trick me?',
					callback: async () => {},
				},
				{
					label: 'Sob',
					callback: () => {},
				},
			],
		}).render(true);
	}

	/**
	 * @description Sets up a context menu for characters in the overview
	 * @param html
	 */
	setupCharacterContextMenu(html) {
		// Initialize the context menu options
		const contextMenuOptions = [
			{
				name: game.i18n.localize('FU.Delete'),
				icon: '<i class="fas fa-trash"></i>',
				callback: (jq) => {
					const id = jq.data('uuid');
					const characters = this.party.characters;
					characters.delete(id);
					this.actor.update({ ['system.characters']: characters });
					console.debug(`${id} was removed from the party ${this.actor.name}`);
				},
			},
		];

		// eslint-disable-next-line no-undef
		new ContextMenu(html, '.character-option', contextMenuOptions, {
			fixed: true,
		});
	}

	/**
	 * @returns {PartySheetActionHook[]}
	 */
	static prepareActionHooks() {
		/** @type PartySheetActionHook[] **/
		let hooks = [];

		// Built-in support
		if (game.modules.get('lookfar')?.active) {
			console.debug('Automatically registering Lookfar Module');
			hooks.push({
				name: 'Travel Check',
				icon: 'fa-solid fa-person-hiking',
				hook: 'lookfarShowTravelCheckDialog',
			});
		}

		// Callback here...

		return hooks;
	}
}

/**
 * @typedef PartySheetActionHook
 * @property {String} name The name to display
 * @property {String} icon A supported font icon
 * @property {String} hook The name of the hook to invoke
 */

// Set up sidebar menu option
Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, (tools) => {
	tools.push({
		name: 'FU.Party',
		title: 'FU.Party',
		icon: 'fa-solid fa fa-users',
		button: true,
		onClick: () => {
			FUPartySheetHelper.openActive();
		},
	});
});

/**
 * @returns {Promise<PartyDataModel>}
 */
async function getActiveModel() {
	const activePartyUuid = game.settings.get(SYSTEM, SETTINGS.activeParty);
	if (activePartyUuid) {
		const party = fromUuidSync(`Actor.${activePartyUuid}`);
		if (party && party.type === 'party') {
			return party.system;
		}
	}
	return null;
}

async function openActive() {
	const party = await getActiveModel();
	if (party) {
		party.parent.sheet.render(true);
	} else {
		ui.notifications.warn('FU.ActivePartyNotAssigned', { localize: true });
	}
}
