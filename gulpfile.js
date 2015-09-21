/*global __dirname */

var gulp = require("gulp"),
    karma = require("karma"),
    qunit = require("gulp-qunit"),
    concat = require("gulp-concat");

var pathToTestsDir = __dirname + "/tests/";

gulp.task("compile-tests", function () {
    var scripts = [
        "_header.js",
        "_shared.js",
        "query-tests.js",
        "store-tests.js",
        "_footer.js"
    ];

    gulp.src(scripts.map(function (name) { return pathToTestsDir + name; }))
        .pipe(concat("all-tests.js"))
        .pipe(gulp.dest(pathToTestsDir));
});

gulp.task("run-all", ["compile-tests"], function (done) {
    new karma.Server({
        signleRun: true,
        configFile: __dirname + "/karma.conf.js"
    });
});