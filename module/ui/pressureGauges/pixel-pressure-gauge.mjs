import { FUPressureGauge } from './pressure-gauge.mjs';

export class FUPixelPressureGauge extends FUPressureGauge {
	static get name() {
		return 'FU.CombatHudPixel';
	}

	static get combatHudTheme() {
		return 'fu-pixel';
	}

	barHeight = 4;

	_getHighlightThickness() {
		return canvas.stage.scale.y;
	}

	_drawHighlight() {
		const highlight = this._getChildElement('Highlight');
		if (!highlight) return;

		const thickness = this._getHighlightThickness();

		highlight.clear();
		highlight.lineStyle(thickness, this.borderColor, 1);
		const { width, height } = this._getScaledSize();

		highlight.moveTo(0, height);
		highlight.lineTo(width, height);
	}

	/** @inheritdoc */
	_createElements(width = 100, height = this.barHeight) {
		const bg = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		bg.tint = this.bgColor;
		this._setChildElement('BG', bg);

		const fg = new globalThis.PIXI.Sprite(this._createProgressTexture(width, height));
		this._setChildElement('FG', fg);

		const mask = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		this._setChildElement('FGMask', mask);
		fg.mask = mask;

		const highlight = new globalThis.PIXI.Graphics();
		this._setChildElement('Highlight', highlight);
		this._drawHighlight();
	}

	onCanvasScale() {
		if (!(this.lastCanvasScale.x === canvas.stage.scale.y && this.lastCanvasScale.y === canvas.stage.scale.y)) {
			super.onCanvasScale();
			this._drawHighlight();

			const { width, height } = this._getScaledSize();
			const fg = this._getChildElement('FG');
			if (fg) {
				fg.texture = this._createProgressTexture(width, height);
			}
		}
	}

	/** @inheritdoc */
	refresh(force = false) {
		try {
			if (force) {
				this._destroyChildren();
				this._createElements();
			}
			if (!this.shouldDrawPressureGauge) {
				this.visible = false;
				return;
			} else {
				this.visible = true;
			}

			const elems = ['BG', 'FG'].map((name) => this._getChildElement(name));
			if (elems.some((elem) => !elem)) throw new Error(`Pressure gauge PIXI elements not created for ${this.token.id}`);

			const [bg, fg] = elems;

			const { width, height } = this._getScaledSize();
			const { current, max } = this.clock;
			bg.tint = this.bgColor;
			bg.width = fg.width = width;
			bg.height = fg.height = height;

			bg.x = bg.y = fg.x = fg.y = 0;

			this._animateWidth(fg.mask, width * (current / max), current === this.lastValue);
			this.lastValue = current;

			this._positionGauge();
		} catch (err) {
			console.error(err);
		}
	}
}
