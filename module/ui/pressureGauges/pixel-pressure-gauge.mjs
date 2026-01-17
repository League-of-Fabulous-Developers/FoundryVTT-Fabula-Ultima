import { FUPressureGauge } from './pressure-gauge.mjs';

export class FUPixelPressureGauge extends FUPressureGauge {
	static get name() {
		return 'FU.CombatHudPixel';
	}

	static get combatHudTheme() {
		return 'fu-pixel';
	}

	barHeight = 4;

	/** @inheritdoc */
	_createElements(width = 100, height = this.barHeight) {
		const bg = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		bg.tint = this.bgColor;
		bg.name = `${this.token.id}.Pressure.BG`;
		this.addChild(bg);

		const fg = new globalThis.PIXI.Sprite(this._createProgressTexture(width, height));
		fg.name = `${this.token.id}.Pressure.FG`;
		this.addChild(fg);

		const mask = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		mask.name = `${this.token.id}.Pressure.FGMask`;
		this.addChild(mask);
		fg.mask = mask;

		const highlight = new globalThis.PIXI.Graphics();
		highlight.name = `${this.token.id}.Pressure.Highlight`;
		this.addChild(highlight);

		highlight.clear();
		highlight.lineStyle(1, this.borderColor, 1);
		highlight.moveTo(0, height);
		highlight.lineTo(width, height);
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

			const elems = ['BG', 'FG'].map((name) => this.getChildByName(`${this.token.id}.Pressure.${name}`));
			if (elems.some((elem) => !elem)) throw new Error(`Pressure gauge PIXI elements not created for ${this.token.id}`);

			const [bg, fg] = elems;

			const { width } = this.token.document.getSize();
			const { current, max } = this.clock;
			bg.tint = this.bgColor;
			bg.width = width;
			bg.height = this.barHeight;
			bg.x = bg.y = 0;

			if (current !== this.lastValue) {
				this._animateWidth(fg.mask, fg.width * (current / max));
				this.lastValue = current;
			}

			fg.x = bg.x;
			fg.y = bg.y;

			this._positionGauge();
		} catch (err) {
			console.error(err);
		}
	}
}
