const gulp = require('gulp');
const babel = require('gulp-babel');
const minify = require('gulp-babel-minify');
const concat = require('gulp-concat');

gulp.task('default', () =>
  gulp.src('src/index.js')
    .pipe(babel({presets: ['@babel/env']}))
    .pipe(minify())
    .pipe(concat('morse-decoder.min.js'))
    .pipe(gulp.dest('dist'))
);
