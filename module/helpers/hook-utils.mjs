/**
 * Invokes `foundry.helpers.Hooks#callAll` for the given hook, with the given parameters and an additional parameter `registerCallback`.
 * The `registerCallback` function takes a callback function as an argument.
 * Registered callbacks will be **called and awaited**, in order of registration, with the given parameters for the hook, but without the added `registerCallback` parameter.
 *
 * @param {string} hook
 * @param {...unknown} args
 * @return {Promise<void>}
 */
export async function callHookWithCallbacks(hook, ...args) {
	/** @type Function[] */
	const callbacks = [];

	const registerCallback = (callback) => {
		callbacks.push(callback);
	};

	foundry.helpers.Hooks.callAll(hook, ...args, registerCallback);

	for (let callback of callbacks) {
		try {
			await callback(...args);
		} catch (err) {
			const msg = `Error thrown in callback function '${callback?.name}' for hook '${hook}'`;
			ui.notifications?.warn(msg, { console: false });
			console.error(msg, err);
		}
	}
}
