'use strict';

//База
var gulp = require('gulp');
var rename = require('gulp-rename');
var del = require('del');
var runsequence = require('run-sequence');

//Post-css и его плагины
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var initial = require('postcss-initial');
var inlineSVG = require('postcss-inline-svg');

//Оптимизация кода
var sass = require('gulp-sass');
var pug = require('gulp-pug');
var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var minifyCSS = require('gulp-csso');
var uglifyJS = require('gulp-uglify');
var svgstore = require('gulp-svgstore');

//Оптимизация изображений
var imagemin = require('gulp-imagemin');
var webp = require('gulp-webp');

//Сервер
var server = require('browser-sync').create();


gulp.task('delete', function () {
  return del('build');
});


//Копирует все нужные файлы в билд
gulp.task('copy', function () {
  return gulp.src([
      'src/fonts/**/*.{woff,woff2}',
      'src/img/**/*',
      'src/vendor/*'
    ],
    {
      base: 'src'
    })
    .pipe(gulp.dest('build'));
});


//Сборка стилей для продакшена
gulp.task('styleProduction', function () {
  return gulp.src('src/sass/style.scss')
    .pipe(sass({
      includePaths: require('node-normalize-scss').includePaths
    }))
    .pipe(postcss([
      autoprefixer(),
      inlineSVG(),
      initial()
    ]))
    .pipe(gulp.dest('build/css'))
    .pipe(minifyCSS({
      restructure: false
    }))
    .pipe(gulp.dest('build/css'))
});


//Сборка стилей для разработки
gulp.task('styleDevelopment', function () {
  return gulp.src('src/sass/style.scss')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass({
      includePaths: require('node-normalize-scss').includePaths
    }))
    .pipe(postcss([
      autoprefixer(),
      inlineSVG(),
      initial()
    ]))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('src/css'))
    .pipe(server.stream());
});

//Сборка html из pug'a для продакшена
gulp.task('htmlProduction', function () {
  return gulp.src('src/*.pug')
    .pipe(pug())
    .pipe(gulp.dest("build"))
});

//Сборка html из pug'a для разработки
gulp.task('htmlDevelopment', function () {
  return gulp.src('src/*.pug')
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest("src"))
    .pipe(server.stream());
});

//Работаем со скриптами
gulp.task('scripts', function () {
  return gulp.src('src/js/**/*.js')
    .pipe(uglifyJS())
    .pipe(gulp.dest('build/js'));
});

//Готовим svg-спрайт
gulp.task('sprite', function () {
  return gulp.src('src/img/icons/icon-*.svg')
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('src/img/icons'))
});


//Девелопмент-сборка с live-reload
gulp.task('serve', ['styleDevelopment', 'htmlDevelopment', 'sprite'], function () {
  server.init({
    server: 'src',
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  gulp.watch('src/sass/**/*.{scss,sass}', ['styleDevelopment']);
  gulp.watch('src/img/*.svg', ['styleDevelopment']);
  gulp.watch('src/**/*.pug', ['htmlDevelopment']);
  gulp.watch('src/img/icons/icon-*.svg', ['sprite']);

  gulp.watch('src/js/**/*.js')
    .on('change', server.reload);
});


//Продакшен-сборка
gulp.task('build', function (done) {
  return runsequence(
    'delete',
    [
      'styleProduction',
      'htmlProduction',
      'scripts',
      'sprite'
    ],
    'copy',
    done
  );
});


//Запуск продакшен-сервера
gulp.task('serveBuild', function () {
  server.init({
    server: 'build',
    notify: false,
    open: true,
    cors: true,
    ui: false
  });
});


//Эти таски запускать вручную, в репозитории хранить уже сжатые изображения

//Оптимизируем изображения
gulp.task('images', function () {
  return gulp.src(['src/img/**/*.{png,jpg,svg}', '!src/img/icons/sprite.svg'])
    .pipe(imagemin([
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.jpegtran({progressive: true}),
      imagemin.svgo({
        plugins: [
          {cleanupNumericValues: {floatPrecision: 1}}
        ]
      })
    ]))
    .pipe(gulp.dest('src/img'));
});


//Создаем вебпи
gulp.task('webp', function () {
  return gulp.src('src/img/content/**/*.{png,jpg}')
    .pipe(webp({quality: 90}))
    .pipe(gulp.dest('src/img/content'));
});


//Общий таск для работы с картинками
gulp.task('buildImages', function (done) {
  return runsequence(
    'images',
    'webp',
    done
  );
});
