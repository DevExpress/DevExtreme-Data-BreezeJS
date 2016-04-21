/*global __dirname */

var gulp = require("gulp"),
    karma = require("karma"),
    serve = require("gulp-serve"),
    qunit = require("gulp-qunit"),
    concat = require("gulp-concat");

var pathToTestsDir = __dirname + "/tests/";
var testScripts = [
    "_header.js",
    "_shared.js",
    "query-tests.js",
    "store-tests.js",
    "_footer.js"
].map(function (name) { return pathToTestsDir + name; });

gulp.task("compile-tests", function () {
    gulp.src(testScripts)
        .pipe(concat("all-tests.js"))
        .pipe(gulp.dest(pathToTestsDir));
});

gulp.task("watch-for-tests", function () {
    gulp.watch([testScripts], ["compile-tests"]);
});

gulp.task("run-all", ["compile-tests"], function (done) {
    new karma.Server({
        signleRun: true,
        configFile: __dirname + "/karma.conf.js"
    }, done).start();
});

gulp.task("server", serve({
    root: ["wwwroot"],
    port: 30001
}));

gulp.task("default", ["compile-tests", "server", "watch-for-tests"]);