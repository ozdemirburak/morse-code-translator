var gulp = require('gulp'), concat = require('gulp-concat'), uglify = require('gulp-uglify'), pump = require('pump');

gulp.task('minify-js', function (cb) {
  pump([
      gulp.src('./src/morsify.js'),
      concat('morsify.min.js'),
      uglify(),
      gulp.dest('dist')
    ],
    cb
  );
});

gulp.task('default', function() {
  gulp.run('minify-js');
});
