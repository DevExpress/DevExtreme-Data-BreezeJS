function createBreezeStore(options) {
    return new BreezeStore($.extend({
        entityManager: createEntityManager(),
        resourceName: DEFAULT_RESOURCE_NAME
    }, options));
}

QUnit.module("[Store-tests]", {
    beforeEach: function () {
        this.server = sinon.fakeServer.create({
            respondImmediately: true
        });
    },
    afterEach: function () {
        this.server.restore();
    }
});

QUnit.test("ctor signatures", function (assert) {
    var store,
        url = "http://service.test/",
        entityQuery = new EntityQuery(),
        resourceName = "SomeResourceName",
        entityManager = new EntityManager(url);

    assert.throws(function () {
        new BreezeStore({});
    });

    assert.throws(function () {
        new BreezeStore(entityManager);
    });

    assert.throws(function () {
        new BreezeStore(undefined, resourceName);
    });

    assert.throws(function () {
        new BreezeStore({
            entityManager: entityManager
        });
    });

    assert.throws(function () {
        new BreezeStore({
            resourceName: resourceName
        });
    });

    store = new BreezeStore(url, resourceName);
    assert.ok(store.entityManager());
    assert.equal(store.entityManager().serviceName, url);
    assert.equal(store._resourceName, resourceName);

    store = new BreezeStore(url, resourceName, entityQuery);
    assert.ok(store.entityManager());
    assert.equal(store._resourceName, resourceName);
    assert.equal(store.entityManager().serviceName, url);
    assert.strictEqual(store._userQuery, entityQuery);

    store = new BreezeStore(entityManager, resourceName);
    assert.strictEqual(store.entityManager(), entityManager);
    assert.equal(store._resourceName, resourceName);

    store = new BreezeStore(entityManager, resourceName, entityQuery);
    assert.strictEqual(store.entityManager(), entityManager);
    assert.equal(store._resourceName, resourceName);
    assert.strictEqual(store._userQuery, entityQuery);

    store = new BreezeStore({
        entityManager: entityManager,
        resourceName: resourceName,
        entityQuery: entityQuery
    });
    assert.strictEqual(store.entityManager(), entityManager);
    assert.equal(store._resourceName, resourceName);
    assert.strictEqual(store._userQuery, entityQuery);

    store = new BreezeStore({
        serviceName: url,
        resourceName: resourceName
    });
    assert.ok(store.entityManager());
    assert.equal(store.entityManager().serviceName, url);
    assert.equal(store._resourceName, resourceName);
});

QUnit.test("load", function (assert) {
    var done = assert.async();

    this.server.respondWith([HTTP_STATUS_OK, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
        d: {
            results: [
                { id: 1 },
                { id: 2 }
            ]
        }
    })]);

    createBreezeStore()
        .load()
        .fail(createNoPasaran(assert))
        .done(function (results, extra) {
            assert.deepEqual(results, [
                { id: 1 },
                { id: 2 }
            ]);
            assert.ok($.isEmptyObject(extra));
        })
        .always(done);
});

QUnit.test("load (with options)", function (assert) {
    var done = assert.async();

    this.server.respondWith(function (request) {
        assert.ok(/\$filter=b eq 'foo'&\$orderby=a desc&\$expand=a,b\/c$/.test(decodeURIComponent(request.url)));
    });

    createBreezeStore()
        .load({ sort: { field: "a", desc: true }, expand: ["a", "b.c"], filter: ["b", "foo"] })
        .always(done);
});

QUnit.test("load (with requireTotalCount)", function (assert) {
    var done = assert.async();

    this.server.respondWith([HTTP_STATUS_OK, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
        d: {
            results: [
                { id: 1 },
                { id: 2 }
            ],
            __count: 2
        }
    })]);

    createBreezeStore()
        .load({ requireTotalCount: true })
        .fail(createNoPasaran(assert))
        .done(function (results, extra) {
            assert.deepEqual(results, [
                { id: 1 },
                { id: 2 }
            ]);
            assert.deepEqual(extra, {
                totalCount: 2
            });
        })
        .always(done);
});

QUnit.test("byKey (simple key)", 1, function (assert) {
    var done = assert.async();

    this.server.respondWith(function (request) {
        // TODO: Why so? Why not 'DEFAULT_RESOURCE_NAME/1'?
        // NOTE: What would happen if no entity satisfies the criteria?
        // var regExp = new RegExp(DEFAULT_RESOURCE_NAME + "\\/1$");
        // assert.ok(regExp.test(decodeURIComponent(request.url)));

        assert.ok(/\$filter=ID eq 1$/.test(decodeURIComponent(request.url)));
    });

    createBreezeStore({ key: "ID" })
        .byKey(toBreezeInt32(1))
        .always(done);
});

QUnit.test("byKey (complex key)", 1, function (assert) {
    var done = assert.async();

    this.server.respondWith(function (request) {
        assert.ok(/\$filter=\(ID1 eq 1\) and \(ID2 eq 2\)$/.test(decodeURIComponent(request.url)));
    });

    createBreezeStore({ key: ["ID1", "ID2"] })
        .byKey({
            "ID1": toBreezeInt32(1),
            "ID2": toBreezeInt32(2),
            "it should be ignored": "it will be ignored"
        })
        .always(done);
});

QUnit.test("key can be obtained from metadata", function (assert) {
    var manager = new EntityManager();

    manager.metadataStore.addEntityType({
        shortName: "EntityWithSimpleKey",
        defaultResourceName: "EntityWithSimpleKey",
        dataProperties: {
            id: { isPartOfKey: true }
        }
    });

    manager.metadataStore.addEntityType({
        shortName: "EntityWithComplexKey",
        defaultResourceName: "EntityWithComplexKey",
        dataProperties: {
            id1: { isPartOfKey: true },
            id2: { isPartOfKey: true }
        }
    });

    var storeForEntityWithSimpleKey = new BreezeStore(manager, "EntityWithSimpleKey"),
        storeForEntityWithComplexKey = new BreezeStore(manager, "EntityWithComplexKey");

    var simpleKey = storeForEntityWithSimpleKey.key(),
        complexKey = storeForEntityWithComplexKey.key();

    assert.equal(simpleKey, "id");
    assert.equal(storeForEntityWithSimpleKey.keyOf({ id: "abc" }), "abc");

    assert.ok($.isArray(complexKey));
    assert.ok($.inArray("id1", complexKey) > -1);
    assert.ok($.inArray("id2", complexKey) > -1);

    assert.deepEqual(storeForEntityWithComplexKey.keyOf({ id1: "abc", id2: "xyz" }), { id1: "abc", id2: "xyz" });
});
