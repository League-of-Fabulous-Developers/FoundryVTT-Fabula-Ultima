import { StringUtils } from './string-utils.mjs';
import FoundryUtils from './foundry-utils.mjs';

/**
 * @description Actions that can be executed from chat messages.
 * @property {String} name The name of the action to be used
 * @property {String} icon The font awesome icon
 * @property {String} img An image to use
 * @property {String} label An optional label to use.
 * @property {String} tooltip The localized tooltip to use
 * @property {Object} fields The fields to use for the action's dataset
 * @property {Boolean} owner Whether this action can only be applied the owner
 * @property {String|undefined} flag
 * @property {DOMStringMap|undefined} dataset
 * @property {String} classes
 * @property {String} style
 * @property {String} color
 * @property {Boolean} targeted Whether this action can be used on targeted tokens (during the chat message generation)
 * @property {Boolean} selected Whether this action can be used on selected tokens instead.
 * @remarks Expects an action handler where dataset.id is a reference to an actor
 */
export class ChatAction {
	constructor(name, icon, tooltip, fields) {
		this.name = name;
		this.icon = icon;
		this.tooltip = tooltip;
		this.withFields(fields);
		this.dataset = {};
		this.label = 'FU.ChatApplySelected';
		this.owner = false;
		this.targeted = true;
		this.selected = false;
	}

	/**
	 * @returns {ChatAction}
	 */
	requiresOwner() {
		this.owner = true;
		return this;
	}

	/**
	 * @param {Object} fields
	 */
	withFields(fields) {
		this.fields = StringUtils.toBase64(fields ?? {});
		return this;
	}

	/**	 *
	 * @param {String} flag
	 * @returns {ChatAction}
	 */
	setFlag(flag) {
		this.flag = flag;
		return this;
	}

	/**
	 * @param {Record<string, string>} dataset
	 * @return {ChatAction}
	 */
	withDataset(dataset) {
		this.dataset = dataset;
		return this;
	}

	/**
	 * @param {FUActor} actor
	 * @return {ChatAction}
	 */
	forActor(actor) {
		return this.withDataset({
			actorId: actor.uuid,
		}).notTargeted();
	}

	/**
	 * @returns {ChatAction}
	 */
	notTargeted() {
		this.targeted = false;
		return this;
	}

	/**
	 * @returns {ChatAction}
	 */
	withSelected() {
		this.selected = true;
		return this;
	}

	/**
	 * @param {String} label
	 * @returns {ChatAction}
	 */
	withLabel(label) {
		this.label = label;
		return this;
	}

	/**
	 * @param {String} color
	 * @return {ChatAction}
	 */
	withColor(color) {
		this.color = color;
		return this;
	}

	/**
	 * @param {String} style
	 * @returns {ChatAction}
	 */
	withStyle(style) {
		this.style = style;
		return this;
	}

	/**
	 * @param {...String} classes
	 * @returns {ChatAction}
	 */
	withClasses(...classes) {
		this.classes = classes.join(' ');
		return this;
	}

	/**
	 * @param {String} img
	 * @returns {ChatAction}
	 */
	withImage(img) {
		this.img = img;
		return this;
	}

	/**
	 * @param {ChatAction[]} actions
	 * @param {EventTarget[]} targetData
	 * @param {Boolean} retarget
	 * @return {Promise<String>}
	 */
	static async renderToChat(actions, targetData = [], retarget = true) {
		const html = await FoundryUtils.renderTemplate('chat/partials/chat-actions', {
			retarget: retarget,
			targets: targetData,
			actions: actions,
			targetedActions: actions.filter((a) => a.targeted),
			selectedActions: actions.filter((a) => a.selected),
		});
		return new Handlebars.SafeString(html);
	}
}
