const alreadyPrinted = new Set();

/**
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
