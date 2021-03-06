module.exports = function (config) {
    config.set({
        basePath: "./",
        frameworks: [
            "qunit"
        ],
        files: [
            "lib/qunit/qunit.css",

            "lib/q/q.js",
            "lib/jquery/jquery.js",
            "lib/devextreme/dx.all.js",
            "lib/datajs/datajs.min.js",

            "lib/breeze-client/breeze.min.js",
            "lib/sinon/index.js",

            "src/dx.data.breeze.js",

            "tests/_shared.js",
            "tests/query-tests.js",
            "tests/store-tests.js"
        ],
        plugins: [
            "karma-qunit",
            "karma-coverage",
            "karma-junit-reporter",
            "karma-phantomjs-launcher"
        ],
        preprocessors: {
            "src/*.js": ["coverage"]
        },
        reporters: [
            "dots",
            "junit",
            "coverage",
            "progress"
        ],
        junitReporter: {
            outputDir: "shippable/testresults/",
            outputFile: "test-results.xml"
        },
        coverageReporter: {
            type: "cobertura",
            dir: "shippable/codecoverage/"
        },
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ["PhantomJS"],
        singleRun: true
    });
};