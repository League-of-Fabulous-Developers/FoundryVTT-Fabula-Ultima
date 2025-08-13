/**
 * @typedef ClickModifiers
 * @prop {boolean} alt
 * @prop {boolean} ctrl
 * @prop {boolean} shift
 */

import { SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';

/**
 * @property {InlineSourceInfo} sourceInfo
 * @property {FUItem} item The item that triggered the pipeline
 * @property {FUActor[]} targets
 * @property {FUActor} sourceActor
 * @property {Set<String>} traits
 * @property {Event | null} event
 */
export class PipelineRequest {
	constructor(sourceInfo, targets) {
		this.sourceInfo = sourceInfo;
		this.targets = targets;
		this.traits = new Set();
		this.item = sourceInfo.resolveItem();
		this.sourceActor = sourceInfo.resolveActor();
	}

	addTraits(...traits) {
		traits.forEach((t) => this.traits.add(t));
	}
}

/**
 * @property {InlineSourceInfo} sourceInfo
 * @property {FUActor} sourceActor The actor whose action triggered the pipeline
 * @property {FUItem} item The item of the actor that triggered the pipeline
 * @property {FUActor} actor The actor the pipeline is modifying
 * @property {Set<String>} traits
 * @property {Event | null} event
 * @property {?} result The result output
 */
export class PipelineContext {
	/**
	 * @param {PipelineRequest} request
	 * @param {FUActor} actor
	 */
	constructor(request, actor) {
		Object.assign(this, request);
		this.actor = actor;
		this.sourceActor = request.sourceActor;
		this.item = request.item;
	}
}

/**
 * @callback PipelineStep
 * @param {PipelineContext} context
 * @returns {Boolean} False if the no further calls in the pipeline are needed
 * @remarks Only to be used synchronously
 */

/**
 * @param {PipelineRequest} request
 * @param {Function} getUpdatesForActor
 * @returns {Promise<Awaited<unknown>[]>}
 */
async function process(request, getUpdatesForActor) {
	const updates = [];
	for (const actor of request.targets) {
		updates.push(getUpdatesForActor(actor));
	}
	return Promise.all(updates);
}

/**
 * @param {Event} event
 * @returns {FUActor[]}
 */
function getSingleTarget(event) {
	const dataId = event.target.closest('a')?.dataset?.id;
	const actor = fromUuidSync(dataId);
	if (!actor) {
		ui.notifications.warn('FU.ChatApplyEffectNoActorsTargeted', { localize: true });
		return [];
	}
	return [actor];
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @param {String} actionName - The name of the data-action, e.g: "roll"
 * @param {(data: Object) => Promise<void>} onClick
 */
function handleClick(message, html, actionName, onClick) {
	html.querySelectorAll(`a[data-action="${actionName}"]`).forEach((element) => {
		element.addEventListener('click', async (event) => {
			event.preventDefault();
			await onClick({ ...element.dataset });
		});
	});
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @param {String} actionName
 * @param {(data: Object) => Promise<void>} action
 */
async function handleClickRevert(message, html, actionName, action) {
	html.querySelectorAll(`a[data-action="${actionName}"]`).forEach((element) => {
		const messageContent = html.querySelector('.message-content');
		const reverted = message.getFlag(SYSTEM, Flags.ChatMessage.RevertedAction)?.includes(actionName);

		if (reverted) {
			messageContent?.classList.add('strikethrough');
			element.classList.add('action-disabled');
		} else {
			element.addEventListener('click', async (event) => {
				event.preventDefault();
				try {
					await action({ ...element.dataset });
					const revertedActions = message.getFlag(SYSTEM, Flags.ChatMessage.RevertedAction) ?? [];
					revertedActions.push(actionName);
					await message.setFlag(SYSTEM, Flags.ChatMessage.RevertedAction, revertedActions);
				} catch (ex) {
					console.debug(ex);
				}
			});
		}
	});
}

/**
 * @param {Map} flags
 * @param {String} key
 * @remarks Documented in {@link Flags}
 */
function toggleFlag(flags, key) {
	(flags[SYSTEM] ??= {})[key] ??= true;
}

/**
 * @param {Map} flags
 * @param {String} key
 * @param {*} value
 * @returns {Map}
 * @remarks Documented in {@link Flags}
 */
function setFlag(flags, key, value) {
	(flags[SYSTEM] ??= {})[key] ??= value;
	return flags;
}

/**
 * @description Constructs an initialized flags object to be assigned in a ChatMessage
 * @param {String} key
 * @param {*} value
 * @returns {Object}
 * @remarks Documented in {@link Flags}
 */
function initializedFlags(key, value) {
	return { [SYSTEM]: { [key]: value } };
}

export const Pipeline = {
	getSingleTarget,
	process,
	handleClick,
	handleClickRevert,
	toggleFlag,
	setFlag,
	initializedFlags,
};
