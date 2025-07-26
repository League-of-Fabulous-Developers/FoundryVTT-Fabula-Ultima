import { GameWellspringManager } from './game-wellspring-manager.mjs';
import { SystemControls } from '../../../../helpers/system-controls.mjs';
import { ActorWellspringManager } from './actor-wellspring-manager.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { FUHooks } from '../../../../hooks.mjs';

/**
 * @typedef {"air","earth","fire","lightning","water"} WellspringElement
 */

/**
 * @type {Record<WellspringElement, {name: string, icon: string, type: string, nameShort: string, element: string}>}
 */
export const WELLSPRINGS = {
	air: {
		name: 'FU.ClassFeatureInvocationsWellspringAirName',
		nameShort: 'FU.ClassFeatureInvocationsWellspringAirNameShort',
		type: 'air',
		element: 'FU.ClassFeatureInvocationsWellspringAirElement',
		icon: 'fu-wind',
	},
	earth: {
		name: 'FU.ClassFeatureInvocationsWellspringEarthName',
		nameShort: 'FU.ClassFeatureInvocationsWellspringEarthNameShort',
		type: 'earth',
		element: 'FU.ClassFeatureInvocationsWellspringEarthElement',
		icon: 'fu-earth',
	},
	fire: {
		name: 'FU.ClassFeatureInvocationsWellspringFireName',
		nameShort: 'FU.ClassFeatureInvocationsWellspringFireNameShort',
		type: 'fire',
		element: 'FU.ClassFeatureInvocationsWellspringFireElement',
		icon: 'fu-fire',
	},
	lightning: {
		name: 'FU.ClassFeatureInvocationsWellspringLightningName',
		nameShort: 'FU.ClassFeatureInvocationsWellspringLightningNameShort',
		type: 'bolt',
		element: 'FU.ClassFeatureInvocationsWellspringLightningElement',
		icon: 'fu-bolt',
	},
	water: {
		name: 'FU.ClassFeatureInvocationsWellspringWaterName',
		nameShort: 'FU.ClassFeatureInvocationsWellspringWaterNameShort',
		type: 'ice',
		element: 'FU.ClassFeatureInvocationsWellspringWaterElement',
		icon: 'ra ra-droplets',
	},
};

export const FLAG_ACTIVE_WELLSPRINGS = 'wellsprings';

let gameWellspringManager;

const renderApp = () => (gameWellspringManager ??= new GameWellspringManager()).render(true);

const regExp = /^\/(ws|wellsprings?)$/i;

function onChatMessage(chatLog, message) {
	if (game.user.isGM && regExp.test(message)) {
		renderApp();
		return false;
	}
}

/**
 * @param {SystemControlTool[]} tools
 */
function onGetSystemTools(tools) {
	tools.push({
		name: 'FU.ClassFeatureInvocationsWellspringManagerTitle',
		icon: 'fas fa-earth-asia',
		visible: game.user.isGM,
		onClick: () => renderApp(),
	});
}

function initialize() {
	Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, onGetSystemTools);

	Hooks.on('projectfu.actor.dataPrepared', ActorWellspringManager.onActorPrepared);

	Hooks.on('chatMessage', onChatMessage);

	Hooks.on('updateScene', (document, changed) => {
		const flagChanged = foundry.utils.getProperty(changed, `flags.${SYSTEM}.${FLAG_ACTIVE_WELLSPRINGS}`);
		const flagRemoved = foundry.utils.getProperty(changed, `flags.${SYSTEM}.-=${FLAG_ACTIVE_WELLSPRINGS}`) === null;
		if (flagChanged || flagRemoved) {
			Hooks.callAll(FUHooks.HOOK_WELLSPRING_CHANGED, [new WellspringDataModel(flagChanged)]);
		}
	});
}

/**
 * @typedef WorldWellspringChangedEvent
 * @property {"world"} scope
 * @property {WellspringDataModel} wellsprings
 */

/**
 * @typedef SceneWellspringChangedEvent
 * @property {"scene"} scope
 * @property {Scene} scene
 * @property {WellspringDataModel} wellsprings
 */

/**
 * @typedef {WorldWellspringChangedEvent | SceneWellspringChangedEvent} WellspringChangedEvent
 */

/**
 * @typedef WellspringDataModel
 * @property {boolean} air
 * @property {boolean} earth
 * @property {boolean} fire
 * @property {boolean} lightning
 * @property {boolean} water
 */
export class WellspringDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField } = foundry.data.fields;
		return {
			air: new BooleanField({ initial: false }),
			earth: new BooleanField({ initial: false }),
			fire: new BooleanField({ initial: false }),
			lightning: new BooleanField({ initial: false }),
			water: new BooleanField({ initial: false }),
		};
	}

	isActive() {
		return this.air || this.earth || this.fire || this.lightning || this.water;
	}
}

export const InvokerIntegration = Object.freeze({
	initialize,
});
