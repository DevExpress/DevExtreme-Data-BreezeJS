$(function () {
    var dataNs = DevExpress.data,
        query = dataNs.queryImpl.breeze,

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

        this.server.respondWith([
            HTTP_STATUS_OK,
            ODATA_V2_RESPONSE_HEADERS,
            JSON.stringify({
                d: {
                    results: [
                        { id: 1 },
                        { id: 2 }
                    ]
                }
            })
        ]);

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
});