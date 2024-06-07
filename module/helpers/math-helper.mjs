function clamp(value, min, max) {
	return Math.max(min, Math.min(value, max));
}

export const MathHelper = Object.freeze({
	clamp,
});
