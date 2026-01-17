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
	barHeight = 12;

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

		const texture = globalThis.PIXI.Texture.from(canvas);
		return texture;
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

	_getBorderThickness() {
		return canvas.stage.scale.y;
	}
	_getShadowThickness() {
		return 2 * canvas.stage.scale.y;
	}

	_drawShadow(width, height, color = this.shadowColor) {
		const shadow = this._getChildElement('Shadow');
		if (!shadow) return;

		shadow.clear();
		const thickness = this._getShadowThickness();
		shadow.lineStyle(thickness, color, 0.25, 0);
		shadow.moveTo(0, thickness);
		shadow.lineTo(width, thickness);

		shadow.moveTo(0, thickness);
		shadow.lineTo(0, height);
	}

	_drawBorder(width, height, color = this.border) {
		const border = this._getChildElement('Border');
		if (!border) return;

		border.clear();
		border.lineStyle(this._getBorderThickness(), color, 1, 0);
		border.drawRect(0, 0, width, height);
	}

	async _setFGPosition(suppressAnimation = false) {
		const fg = this._getChildElement('FG');
		if (!fg?.mask) return;

		const { current = 0, max = 0 } = this.clock ?? {};
		const perc = current / max;
		const x = -(fg.mask.width - fg.mask.width * perc);

		if (!this.token.isPreview && !suppressAnimation) {
			globalThis.gsap.killTweensOf(fg);
			await globalThis.gsap.to(fg.mask, { x, duration: this.animationDuration / 1000 });
		} else {
			fg.mask.x = x;
		}
	}

	onCanvasScale() {
		if (!(this.lastCanvasScale.x === canvas.stage.scale.y && this.lastCanvasScale.y === canvas.stage.scale.y)) {
			super.onCanvasScale();
			const { width, height } = this._getScaledSize();
			const fg = this._getChildElement('FG');
			if (fg?.mask) fg.mask.texture = this._createFGMaskTexture(width, height);

			if (this.mask) this.mask.texture = this._createMaskTexture(width, height);
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

		this._setFGPosition(true);
	}

	/** @inheritdoc */
	refresh(force = false) {
		try {
			const { width, height } = this._getScaledSize();

			if (force) {
				this._destroyChildren();
				const { width, height } = this._getScaledSize();
				this._createElements(width, height);
			}

			if (!this.shouldDrawPressureGauge) {
				this.visible = false;
				return;
			} else {
				this.visible = true;
			}

			const elems = ['BG', 'FG', 'Border', 'Mask'].map((name) => this._getChildElement(name));
			if (elems.some((elem) => !elem)) throw new Error(`Pressure gauge PIXI elements not created for ${this.id}!`);

			const [bg, fg, border, mask] = elems;
			const { current } = this.clock;

			this._drawBorder(width, height, this.borderColor);
			this._drawShadow(width, height, this.shadowColor);

			bg.tint = this.bgColor;
			bg.width = fg.width = border.width;
			bg.height = fg.height = border.height;

			bg.x = bg.y = fg.y = border.x = border.y = mask.x = mask.y = 0;

			// fg.texture = this._createProgressTexture(width, this.barHeight);
			this._setFGPosition(current === this.lastValue);
			this.lastValue = current;
			this._positionGauge();
		} catch (err) {
			console.error(err);
		}
	}
}
