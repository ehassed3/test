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
      'fonts/**/*.{woff,woff2}',
      'img/**/*',
      'vendor/*'
    ],
    {
      base: '.'
    })
    .pipe(gulp.dest('build'));
});


//Сборка стилей для продакшена
gulp.task('styleProduction', function () {
  return gulp.src('sass/style.scss')
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
  return gulp.src('sass/style.scss')
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
    .pipe(gulp.dest('css'))
    .pipe(server.stream());
});

//Сборка html из pug'a для продакшена
gulp.task('htmlProduction', function () {
  return gulp.src('*.pug')
    .pipe(pug())
    .pipe(gulp.dest("build"))
});

//Сборка html из pug'a для разработки
gulp.task('htmlDevelopment', function () {
  return gulp.src('*.pug')
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest("."))
    .pipe(server.stream());
});

//Работаем со скриптами
gulp.task('scripts', function () {
  return gulp.src('js/**/*.js')
    .pipe(uglifyJS())
    .pipe(gulp.dest('build/js'));
});


//Сваливаем в билд все полифилы
gulp.task('vendor', function () {
  return gulp.src([
    'node_modules/svg4everybody/dist/svg4everybody.min.js',
    'node_modules/picturefill/dist/picturefill.min.js'
  ])
    .pipe(gulp.dest('vendor'));
});


//Готовим svg-спрайт
gulp.task('sprite', function () {
  return gulp.src('img/icons/icon-*.svg')
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('img/icons'))
});


//Девелопмент-сборка с live-reload
gulp.task('serve', ['styleDevelopment', 'htmlDevelopment', 'sprite', 'vendor'], function () {
  server.init({
    server: '.',
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  gulp.watch('sass/**/*.{scss,sass}', ['styleDevelopment']);
  gulp.watch('img/*.svg', ['styleDevelopment']);
  gulp.watch('*.pug', ['htmlDevelopment']);
  gulp.watch('img/icons/icon-*.svg', ['sprite']);

  gulp.watch('js/**/*.js')
    .on('change', server.reload);
});


//Продакшен-сборка
gulp.task('build', function (done) {
  return runsequence(
    'delete',
    [
      'styleProduction',
      'html',
      'scripts',
      'vendor',
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
  return gulp.src(['img/**/*.{png,jpg,svg}', '!img/icons/sprite.svg'])
    .pipe(imagemin([
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.jpegtran({progressive: true}),
      imagemin.svgo({
        plugins: [
          {cleanupNumericValues: {floatPrecision: 1}}
        ]
      })
    ]))
    .pipe(gulp.dest('img'));
});


//Создаем вебпи
gulp.task('webp', function () {
  return gulp.src('img/content/**/*.{png,jpg}')
    .pipe(webp({quality: 90}))
    .pipe(gulp.dest('img/content'));
});


//Общий таск для работы с картинками
gulp.task('buildImages', function (done) {
  return runsequence(
    'images',
    'webp',
    done
  );
});
