$(function () {
    var dataNs = DevExpress.data,
        query = dataNs.queryImpl.breeze,

        DataType = breeze.DataType,
        DataService = breeze.DataService,
        EntityQuery = breeze.EntityQuery,
        EntityManager = breeze.EntityManager;

    var HTTP_STATUS_OK = 200;
    var ODATA_V2_RESPONSE_HEADERS = {
        "DataServiceVersion": 2.0,
        "Content-Type": "application/json;charset=utf-8"
    };

    breeze.config.initializeAdapterInstances({
        dataService: "OData"
    });

    function createBreezeQuery(options) {
        options = options || {};

        var resourceNameOrQuery = options.resourceNameOrQuery || "resourceName";
        var queryOptions = options.queryOptions || {};
        var manager = options.manager || new EntityManager({
            dataService: new DataService({
                serviceName: "...",
                hasServerMetadata: false
            })
        });

        return query(manager, resourceNameOrQuery, queryOptions);
    }

    QUnit.module("Global", {
        beforeEach: function () {
            this.server = sinon.fakeServer.create({
                respondImmediately: true
            });
        },
        afterEach: function () {
            this.server.restore();
        }
    });

    QUnit.test("exists", function (assert) {
        assert.ok("breeze" in DevExpress.data.queryImpl);
    });

    QUnit.test("enumerate", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(!/\$inlineCount/.test(decodeURIComponent(request.url)));

            request.respond(HTTP_STATUS_OK, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
                d: {
                    results: [
                        { id: 1 },
                        { id: 2 }
                    ]
                }
            }));
        });

        createBreezeQuery()
            .enumerate()
            .fail(function () {
                assert.ok(false, "Shouldn't reach this point");
            })
            .done(function (results, extra) {
                assert.deepEqual(results, [
                    { "id": 1 },
                    { "id": 2 }
                ]);
                assert.ok($.isEmptyObject(extra));
            }).always(done);
    });

    QUnit.test("enumerate (with requireTotalCount)", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$inlinecount=allpages$/.test(decodeURIComponent(request.url)));

            request.respond(HTTP_STATUS_OK, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
                d: {
                    results: [
                        { id: 1 },
                        { id: 2 }
                    ],
                    __count: 2
                }
            }));
        });

        createBreezeQuery({ queryOptions: { requireTotalCount: true } })
            .enumerate()
            .fail(function () {
                assert.ok(false, "Shouldn't reach this point");
            })
            .done(function (results, extra) {
                assert.deepEqual(results, [
                    { "id": 1 },
                    { "id": 2 }
                ]);
                assert.deepEqual(extra, {
                    totalCount: 2
                });
            }).always(done);
    });

    QUnit.test("sortBy / thenBy", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$orderby=a desc,b,c\/d$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .sortBy("a", true)
            .thenBy("b")
            .thenBy("c.d")
            .enumerate()
            .always(done);
    });

    QUnit.test("thenBy cannot be called before sortBy", function (assert) {
        assert.throws(function() {
            createBreezeQuery.thenBy("b");
        });
    });

    QUnit.test("grouping throws", function (assert) {
        assert.throws(function () {
            createBreezeQuery().groupBy();
        });
    });

    QUnit.test("select", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$select=a$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .select("a")
            .enumerate()
            .always(done);
    });

    QUnit.test("expand", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$expand=a$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .expand("a")
            .enumerate()
            .always(done);
    });

    QUnit.test("select and implicit expand", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$expand=a&\$select=a\/b,a\/c,b$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .select("a.b", "a.c", "b")
            .enumerate()
            .always(done);
    });

    QUnit.test("implicit expand doesn't overwrite user expand", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$expand=b,a&\$select=b\/c$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery({ resourceNameOrQuery: new EntityQuery("resourceName").expand("a") })
            .select("b.c")
            .enumerate()
            .always(done);
    });

    QUnit.test("slice", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$skip=1&\$top=2$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .slice(1, 2)
            .enumerate()
            .always(done);
    });

    QUnit.test("simple filter", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            assert.ok(/\$filter=name eq 'John'$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .filter("name", "John")
            .enumerate()
            .always(done);
    });

    QUnit.test("complex filter", function (assert) {
        var done = assert.async(),
            one = {
                value: 1,
                dataType: DataType.Int32
            };

        this.server.respondWith(function (request) {
            assert.ok(/\$filter=\(\(a ne 1\) or \(\(b eq 1\) and \(c gt 1\)\) or \(c lt 1\) or \(c eq 1\)\) and \(d eq 1\)$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .filter([
                [
                    ["a", "<>", one],
                    "or",
                    [
                        ["b", one],
                        ["c", ">", one]
                    ],
                    "or",
                    ["c", "<", one],
                    "or",
                    ["c", one]
                ],
                "and",
                ["d", one]
            ])
            .enumerate()
            .always(done);
    });

    QUnit.test("all filter operations", function (assert) {
        var done = assert.async();

        this.server.respondWith(function (request) {
            // TODO: Find another way to test query string params
            assert.ok(/\$filter=\(a eq 'foo'\) and \(a gt 'foo'\) and \(a lt 'foo'\) and \(a ne 'foo'\) and \(a ge 'foo'\) and \(a le 'foo'\) and \(endswith\(a,'x'\) eq true\) and \(startswith\(a,'x'\) eq true\) and \(substringof\('x',a\) eq true\) and \(not \(substringof\('x',a\) eq true\)\)$/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .filter([
                ["a", "=", "foo"],
                ["a", ">", "foo"],
                ["a", "<", "foo"],
                ["a", "<>", "foo"],
                ["a", ">=", "foo"],
                ["a", "<=", "foo"],
                ["a", "endswith", "x"],
                ["a", "startswith", "x"],
                ["a", "contains", "x"],
                ["a", "notcontains", "x"]
            ])
            .enumerate()
            .always(done);
    });

    QUnit.test("mixin and/or operators are not allowed", function (assert) {
        assert.throws(function() {
            createBreezeQuery()
                .filter([
                    ["a", "foo"],
                    "and",
                    ["a", "<", "bar"],
                    "or",
                    ["a", ">", "foobar"]
                ])
                .enumerate();
        });
        assert.throws(function() {
            createBreezeQuery()
                .filter([
                    ["a", "foo"],
                    ["a", "<", "bar"],
                    "or",
                    ["a", ">", "foobar"]
                ])
                .enumerate();
        });
        assert.throws(function() {
            createBreezeQuery()
                .filter([
                    ["a", "foo"],
                    "or",
                    ["a", "<", "bar"],
                    ["a", ">", "foobar"]
                ])
                .enumerate();
        });
    });

    QUnit.test("count", function (assert) {
        var done = assert.async();

        this.server.respondWith([
            HTTP_STATUS_OK,
            ODATA_V2_RESPONSE_HEADERS,
            JSON.stringify({
                d: {
                    __count: 42
                }
            })
        ]);

        createBreezeQuery()
            .count()
            .fail(function () {
                assert.ok(false, "Shouldn't reach this point");
            })
            .done(function (r) {
                assert.equal(r, 42);
            }).always(done);
    });
});