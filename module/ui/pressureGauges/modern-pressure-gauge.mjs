import { FUPressureGauge } from './pressure-gauge.mjs';

export class FUModernPressureGauge extends FUPressureGauge {
	static get name() {
		return 'FU.CombatHudModern';
	}

	static get combatHudTheme() {
		return 'fu-modern';
	}

	bgColor = '#656565';
	borderColor = '#c7c7c7';
	barHeight = 6;

	clipSize = 0.1;

	_createMaskTexture(width, height) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');

		ctx.beginPath();
		ctx.moveTo(width * this.clipSize, 0);
		ctx.lineTo(width, 0);

		ctx.lineTo(width - width * this.clipSize, height);
		ctx.lineTo(0, height);

		ctx.closePath();

		ctx.fillStyle = 'white';
		ctx.fill();

		return globalThis.PIXI.Texture.from(canvas);
	}

	_createFGMaskTexture(width, height) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(width, 0);
		ctx.lineTo(width - width * this.clipSize, height);
		ctx.lineTo(0, height);

		ctx.closePath();
		ctx.fillStyle = 'white';
		ctx.fill();

		return globalThis.PIXI.Texture.from(canvas);
	}

	_drawShadow(width, height, color = this.shadowColor) {
		const shadow = this.getChildByName(`${this.token.id}.Pressure.Shadow`);
		if (!shadow) return;

		shadow.clear();
		shadow.lineStyle(1, color, 0.25);
		shadow.moveTo(2, 2);
		shadow.lineTo(width - 2, 2);

		shadow.moveTo(1, 2);
		shadow.lineTo(1, height - 1);
	}

	_drawBorder(width, height, color = this.border) {
		const border = this.getChildByName(`${this.token.id}.Pressure.Border`);
		if (!border) return;
		border.clear();
		border.lineStyle(1, color, 1);
		border.drawRect(0, 0, width, height);
	}

	_setFGMaskPosition(mask, x, suppressAnimation = false) {
		if (!mask?.transform) return;
		if (!this.token.isPreview && !suppressAnimation) {
			globalThis.gsap.killTweensOf(mask);
			globalThis.gsap.to(mask, { x, duration: this.animationDuration / 1000 });
		} else {
			mask.x = x;
		}
	}

	/** @inheritdoc */
	_createElements(width = 100, height = this.barHeight) {
		const { current = 0, max = 0 } = this.clock ?? {};
		const bg = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		bg.name = `${this.token.id}.Pressure.BG`;
		this.addChild(bg);

		const fg = new globalThis.PIXI.Sprite(this._createProgressTexture(width, height));
		fg.name = `${this.token.id}.Pressure.FG`;

		this.addChild(fg);

		const fgmask = new globalThis.PIXI.Sprite(this._createFGMaskTexture(width, height, current / max));
		fgmask.name = `${this.token.id}.Pressure.FGMask`;
		this.addChild(fgmask);
		fg.mask = fgmask;

		const shadow = new globalThis.PIXI.Graphics();
		shadow.name = `${this.token.id}.Pressure.Shadow`;
		this.addChild(shadow);
		this._drawShadow(width, height, this.shadowColor);

		const border = new globalThis.PIXI.Graphics();
		border.name = `${this.token.id}.Pressure.Border`;
		this.addChild(border);
		this._drawBorder(width, height, this.borderColor);

		const mask = new globalThis.PIXI.Sprite(this._createMaskTexture(width, height));
		mask.name = `${this.token.id}.Pressure.Mask`;
		this.addChild(mask);
		this.mask = mask;

		this._setFGMaskPosition(fg.mask, -width + width * (current / max), true);
	}

	/** @inheritdoc */
	refresh(force = false) {
		try {
			const { width } = this.token.document.getSize();

			if (force) {
				this._destroyChildren();
				this._createElements(width, this.barHeight);
			}

			if (!this.shouldDrawPressureGauge) {
				this.visible = false;
				return;
			} else {
				this.visible = true;
			}

			const elems = ['BG', 'FG', 'Border', 'Mask'].map((name) => this.getChildByName(`${this.token.id}.Pressure.${name}`));
			if (elems.some((elem) => !elem)) throw new Error(`Pressure gauge PIXI elements not created for ${this.id}!`);

			const [bg, fg, border, mask] = elems;
			const { current, max } = this.clock;

			bg.tint = this.bgColor;
			bg.width = width;
			bg.height = this.barHeight;
			bg.x = bg.y = 0;

			fg.x = border.x = mask.x = bg.x;
			fg.y = border.y = mask.y = bg.y;

			fg.width = width;
			fg.height = this.barHeight;

			// fg.texture = this._createProgressTexture(width, this.barHeight);
			if (current !== this.lastValue) {
				// this._setFGMaskWidth(fg.mask, fg.width * (current / max));
				this._setFGMaskPosition(fg.mask, -width + width * (current / max));
				this.lastValue = current;
			}

			this._positionGauge();
		} catch (err) {
			console.error(err);
		}
	}
}
