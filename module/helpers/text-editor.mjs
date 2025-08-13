/** @type ProxyHandler */
const handler = {
	get(target, p, receiver) {
		return Reflect.get(foundry.applications.ux.TextEditor.implementation, p);
	},
	set(target, p, newValue, receiver) {
		return Reflect.set(foundry.applications.ux.TextEditor.implementation, p, newValue);
	},
	has(target, p) {
		return Reflect.has(foundry.applications.ux.TextEditor.implementation, p);
	},
	apply(target, thisArg, argArray) {
		return Reflect.apply(target, foundry.applications.ux.TextEditor.implementation, argArray);
	},
	construct(target, argArray) {
		return Reflect.construct(foundry.applications.ux.TextEditor.implementation, argArray);
	},
	ownKeys(target) {
		return Reflect.ownKeys(foundry.applications.ux.TextEditor.implementation);
	},
	defineProperty(target, property, attributes) {
		return Reflect.defineProperty(foundry.applications.ux.TextEditor.implementation, property, attributes);
	},
	deleteProperty(target, p) {
		return Reflect.delete(foundry.applications.ux.TextEditor.implementation, p);
	},
	getOwnPropertyDescriptor(target, p) {
		return Reflect.getOwnPropertyDescriptor(foundry.applications.ux.TextEditor.implementation, p);
	},
	getPrototypeOf(target) {
		return Reflect.getPrototypeOf(foundry.applications.ux.TextEditor.implementation);
	},
	setPrototypeOf(target, v) {
		return Reflect.setPrototypeOf(foundry.applications.ux.TextEditor.implementation, v);
	},
	isExtensible(target) {
		return Reflect.isExtensible(foundry.applications.ux.TextEditor.implementation);
	},
	preventExtensions(target) {
		return Reflect.preventExtensions(foundry.applications.ux.TextEditor.implementation);
	},
};
const TextEditorProxy = new Proxy(foundry.applications.ux.TextEditor.implementation, handler);

/**
 * Live-binding proxy of foundry.applications.ux.TextEditor.implementation for ease of use.
 */
export const TextEditor = TextEditorProxy;
