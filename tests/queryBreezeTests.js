$(function () {
    var dataNs = DevExpress.data,
        query = dataNs.queryImpl.breeze,

        DataService = breeze.DataService,
        EntityQuery = breeze.EntityQuery,
        EntityManager = breeze.EntityManager;

    breeze.config.initializeAdapterInstances({
        dataService: "OData"
    });

    function createBreezeQuery(options) {
        options = options || {};
        return query(
            options.manager || new EntityManager({
                dataService: new DataService({
                    serviceName: "...",
                    hasServerMetadata: false
                })
            }),
            options.resourceNameOrQuery || "resourceName",
            options.queryOptions || {}
            );
    }

    QUnit.test("exists", function (assert) {
        assert.ok("breeze" in DevExpress.data.queryImpl);
    });

    QUnit.test("enumerate", function (assert) {
        var goFurther = assert.async();
        var server = sinon.fakeServer.create({
            respondImmediately: true
        });

        server.respondWith([
            200,
            {
                "DataServiceVersion": 2.0,
                "Content-Type": "application/json;charset=utf-8"
            },
            JSON.stringify({
                d: {
                    results: [
                        { id: 1 },
                        { id: 2 }
                    ]
                }
            })
        ]);

        createBreezeQuery().enumerate()
            .fail(function () {
                assert.ok(false, "Shouldn't reach this point");
            })
            .done(function (results, extra) {
                assert.deepEqual(results, [
                    { "id": 1 },
                    { "id": 2 }
                ]);
                assert.ok($.isEmptyObject(extra));
            }).always(function () {
                server.restore();
                goFurther();
            });
    });
});