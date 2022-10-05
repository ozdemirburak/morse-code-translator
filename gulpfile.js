const gulp = require('gulp');
const babel = require('gulp-babel');
const minify = require('gulp-babel-minify');
const concat = require('gulp-concat');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');

gulp.task('default', () =>
  tsProject
    .src()
    .pipe(tsProject())
    .js
    .pipe(babel({ presets: ['@babel/env'] }))
    .pipe(minify())
    .pipe(concat('morse-decoder.min.js'))
    .pipe(gulp.dest('dist'))
);
