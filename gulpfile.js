import gulp from 'gulp';
import prefix from 'gulp-autoprefixer';
import sourcemaps from 'gulp-sourcemaps';
import gulpSass from 'gulp-sass';
import * as sassCompiler from 'sass';

const sass = gulpSass(sassCompiler);

/* ----------------------------------------- */
/*  Compile Sass
/* ----------------------------------------- */

// Small error handler helper function.
function handleError(err) {
	console.log(err.toString());
	this.emit('end');
}

const SYSTEM_SCSS = ['styles/scss/**/*.scss'];
function compileScss() {
	// Configure options for sass output. For example, 'expanded' or 'nested'
	let options = {
		outputStyle: 'expanded',
	};
	return gulp
		.src(SYSTEM_SCSS)
		.pipe(sourcemaps.init())
		.pipe(sass(options).on('error', handleError))
		.pipe(
			prefix({
				cascade: false,
			}),
		)
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./styles/css'));
}

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
	gulp.watch(SYSTEM_SCSS, build);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

export default gulp.series(compileScss, watchUpdates);
export const build = gulp.series(compileScss);
