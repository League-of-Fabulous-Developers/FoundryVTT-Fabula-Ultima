/**
 * Track which deprecated method has already been logged.
 * @type {Set<string>}
 */
const alreadyPrinted = new Set();

/**
 * Add a log message to a removed field in a data model.
 * For nested fields the required nested objects will be defined on the class.
 * If the field has no replacement its value will be undefined, and it cannot be set to any other value.
 * If the field has a designated replacement it will reflect the value of its replacement and will set the value of its replacement.
 * @param {typeof foundry.abstract.DataModel} root the DataModel subclass
 * @param {string} key
 * @param {string} [replacementKey]
 * @param {boolean} once
 * @return void
 */
export const deprecationNotice = (root, key, replacementKey, once = true) => {
	let parentKeys = key.split('.');
	let propertyKey = parentKeys.pop();

	let currentObject = root.prototype;
	for (let parentKey of parentKeys) {
		if (!(parentKey in currentObject)) {
			const obj = {
				get root() {
					let current = this._root;
					while (current && !(current instanceof root)) {
						current = current._root;
					}
					return current;
				},
			};
			Object.defineProperty(currentObject, parentKey, {
				get() {
					obj._root = this;
					return obj;
				},
			});
		}
		currentObject = currentObject[parentKey];
	}

	let fqn = `${root.name}.${key}`;
	if (replacementKey) {
		Object.defineProperty(currentObject, propertyKey, {
			get() {
				if (!alreadyPrinted.has(fqn)) {
					console.log(`${fqn} is deprecated and replaced by ${root.name}.${replacementKey}`, new Stacktrace());
					if (once) {
						alreadyPrinted.add(fqn);
					}
				}
				return foundry.utils.getProperty(this.root, replacementKey);
			},
			set(v) {
				if (!alreadyPrinted.has(fqn)) {
					console.log(`${fqn} is deprecated and replaced by ${root.name}.${replacementKey}`, new Stacktrace());
					if (once) {
						alreadyPrinted.add(fqn);
					}
				}
				foundry.utils.setProperty(this.root, replacementKey, v);
			},
			configurable: false,
			enumerable: false,
		});
	} else {
		Object.defineProperty(currentObject, propertyKey, {
			get() {
				if (!alreadyPrinted.has(fqn)) {
					console.log(`${fqn} is deprecated without replacement`, new Stacktrace());
					if (once) {
						alreadyPrinted.add(fqn);
					}
				}
				return undefined;
			},
			set(v) {
				if (!alreadyPrinted.has(fqn)) {
					console.log(`${fqn} is deprecated without replacement`, new Stacktrace());
					if (once) {
						alreadyPrinted.add(fqn);
					}
				}
			},
			configurable: false,
			enumerable: false,
		});
	}
};

class Stacktrace extends Error {
	get name() {
		return 'Stacktrace';
	}
}
