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

    QUnit.test("exists", function (assert) {
        assert.ok("breeze" in DevExpress.data.queryImpl);
    });

    QUnit.test("enumerate", function (assert) {
        var done = assert.async();
        var server = sinon.fakeServer.create({
            respondImmediately: true
        });

        server.respondWith([
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
            }).always($.proxy(server.restore, server), done);
    });

    QUnit.test("sortBy / thenBy", function (assert) {
        var done = assert.async();
        var server = sinon.fakeServer.create({
            respondImmediately: true
        });

        server.respondWith(function (request) {
            assert.ok(/a desc,b,c\/d/.test(decodeURIComponent(request.url)));
        });

        createBreezeQuery()
            .sortBy("a", true)
            .thenBy("b")
            .thenBy("c.d")
            .enumerate()
            .always($.proxy(server.restore, server), done);
    });

    QUnit.test("thenBy cannot be called before sortBy", function (assert) {
        assert.throws(function() {
            createBreezeQuery.thenBy("b");
        });
    });
});