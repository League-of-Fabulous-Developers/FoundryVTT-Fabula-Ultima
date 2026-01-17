import { SYSTEM } from '../../helpers/config.mjs';
import { SETTINGS } from '../../settings.js';

export class FUPressureGauge extends globalThis.PIXI.Container {
	fgStartColor = '#f7c754';
	fgEndColor = '#d17f10';

	borderColor = '#c7c7c7';
	bgColor = '#656565';
	shadowColor = '#000000';

	animationDuration = 250;
	barHeight = 5;

	lastValue = 0;

	get clock() {
		return this.token?.actor?.resolveProgress('pressure');
	}

	get usePressureSystem() {
		return !!game?.settings.get(SYSTEM, SETTINGS.pressureSystem);
	}

	get shouldDrawPressureGauge() {
		return !!(this.usePressureSystem && this.clock && this.token.inCombat);
	}

	/**
	 * Creates necessary PIXI display objects for this particular gauge style
	 */
	_createElements() {
		const bg = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		bg.name = `${this.token.id}.Pressure.BG`;
		this.addChild(bg);

		const fg = new globalThis.PIXI.Sprite();
		fg.name = `${this.token.id}.Pressure.FG`;
		this.addChild(fg);

		const mask = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		mask.name = `${this.token.id}.Pressure.FGMask`;
		this.addChild(mask);
		fg.mask = mask;

		const shadow = new globalThis.PIXI.Graphics();
		shadow.name = `${this.token.id}.Pressure.Shadow`;
		this.addChild(shadow);

		const border = new globalThis.PIXI.Graphics();
		border.name = `${this.token.id}.Pressure.Border`;
		this.addChild(border);
	}

	_createProgressTexture(width, height) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		const gradient = ctx.createLinearGradient(0, 0, width, 0);
		gradient.addColorStop(0, this.fgStartColor);
		gradient.addColorStop(1, this.fgEndColor);

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		return globalThis.PIXI.Texture.from(canvas);
	}

	/**
	 * Called hwen the gauge should be redrawn
	 * @param {boolean} force - If true, will destroy then recreate display objects
	 */
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

			const [bg, fg, border, mask, shadow] = ['BG', 'FG', 'Border', 'FGMask', 'Shadow'].map((name) => this.getChildByName(`${this.token.id}.Pressure.${name}`));

			if (!(bg && fg && border && mask)) throw new Error(`Pressure gauge PIXI elements not created for ${this.id}!`);

			const { width } = this.token.document.getSize();

			const { current, max } = this.clock;
			bg.tint = this.bgColor;
			bg.width = width;
			bg.height = this.barHeight;
			bg.x = bg.y = 0;

			fg.texture = this._createProgressTexture(width, this.barHeight);

			if (current !== this.lastValue && !this.token.isPreview) {
				const newWidth = fg.width * (current / max);
				globalThis.gsap.killTweensOf(fg.mask);
				globalThis.gsap.to(fg.mask, { width: newWidth, duration: this.animationDuration / 1000 }).then(() => {
					this.lastValue = current;
				});
			} else {
				fg.mask.width = fg.width * (current / max);
			}

			fg.x = bg.x;
			fg.y = bg.y;

			border.clear();
			border.lineStyle(1, this.borderColor, 1);
			border.drawRect(0, 0, width, this.barHeight);

			shadow.clear();
			shadow.lineStyle(1, this.shadowColor, 0.25);
			shadow.moveTo(2, 2);
			shadow.lineTo(width - 2, 2);

			shadow.moveTo(1, 2);
			shadow.lineTo(1, this.barHeight - 1);

			this.y = -(this.height + 5);
			this.token.tooltip.y = this.y;
		} catch (err) {
			console.error(err);
		}
	}

	destroy() {
		this._destroyChildren();
		super.destroy();
	}

	_destroyChildren() {
		const children = [...this.children];
		this.removeChildren();
		children.forEach((child) => {
			child.destroy();
		});
	}

	constructor(token) {
		if (!(token instanceof foundry.canvas.placeables.Token)) throw new Error(`Invalid token provided`);

		super();

		this.token = token;
		this._createElements();
	}
}
