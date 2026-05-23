import FUApplication from '../ui/application.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { systemTemplatePath } from '../helpers/system-utils.mjs';
import { Flags } from '../helpers/flags.mjs';

export class CombatHudSettingsStandalone extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'combat-hud-config-app', 'sheet', 'backgroundstyle'],
		id: 'combat-hud-settings',
		position: {
			width: 600,
		},
		tag: 'form',
		form: {
			closeOnSubmit: true,
			submitOnChange: false,
			handler: CombatHudSettingsStandalone.#save,
		},
		actions: {
			resetPosition: CombatHudSettingsStandalone.ResetPosition,
			openUserConfig: CombatHudSettingsStandalone.OpenUserConfig,
		},
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		trackedResources: {
			template: systemTemplatePath('app/settings/combat-hud/combat-hud-resources-actor'),
		},

		buttons: {
			template: systemTemplatePath('app/settings/combat-hud/combat-hud-buttons'),
		},
	};

	/**
	 * @this CombatHudSettingsStandalone
	 */
	static async #save() {
		const formData = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.element).object);
		await this.actor.setFlag(Flags.Scope, Flags.Actor.combatHud.trackedResources, [formData.track]);
		const { trackedActorResource1, trackedActorResource2, trackedActorResource3, trackedActorResource4 } = formData;
		await this.actor.setFlag(Flags.Scope, Flags.Actor.combatHud.trackedResources, [trackedActorResource1, trackedActorResource2, trackedActorResource3, trackedActorResource4]);
	}

	_getLocalizedResource(resource) {
		const localizationString = FU.combatHudResources[resource];
		if (localizationString) return game.i18n.localize(localizationString);
		return resource;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.actor = this.actor;

		context.trackedResources = FU.combatHudResources;

		const maxTrackedResources = 4;
		const trackedResources = this.actor?.getFlag(Flags.Scope, Flags.Actor.combatHud.trackedResources) ?? new Array(maxTrackedResources).fill('default');

		for (let i = 0; i < maxTrackedResources; i++) {
			const trackEntries = Object.entries(this.actor.tracks);
			context[`trackedActorResource${i + 1}`] = trackedResources[i] ?? 'default';
			context[`trackedActorResources${i + 1}`] = [
				{
					value: 'default',
					label: game.i18n.format('FU.CombatHudTrackedActorResourceUseDefault', { value: this._getLocalizedResource(game.settings.get(SYSTEM, SETTINGS[`optionCombatHudTrackedPCResource${i + 1}`])) }),
				},
				...Object.entries(FU.combatHudResources)
					.map(([key, value]) => ({
						value: key,
						label: value,
						group: 'Default', // This will be localized
					}))
					.sort((a, b) => a.value.localeCompare(b.value)),
				// Actor-specific tracks
				...trackEntries
					.map(([key, value]) => ({
						value: `tracks.${key}`,
						label: value.name ? value.name : key,
						group: 'FU.CombatHudTrackedResourcesActorGroup', // This will be localized
					}))
					.sort((a, b) => a.value.localeCompare(b.value)),
			];
		}

		console.log('Context:', context);
		return context;
	}

	/**
	 *
	 * @param {Actor} actor
	 * @param {FoundryUtils.applications.api.ApplicationV2.Configuration} options
	 */
	constructor(actor, options) {
		super(options);
		this.actor = actor;
	}
}
