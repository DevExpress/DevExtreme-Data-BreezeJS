function createBreezeStore(options) {
    return new BreezeStore($.extend({
        entityManager: createEntityManager(),
        resourceName: DEFAULT_RESOURCE_NAME
    }, options));
}

function createBreezeStoreWithDefaultEntityType(storeOptions) {
    var store = createBreezeStore(storeOptions);

    store.entityManager().metadataStore.addEntityType({
        dataProperties: {
            id: { isPartOfKey: true },
            name: { }
        },
        shortName: DEFAULT_ENTITY_NAME,
        defaultResourceName: DEFAULT_RESOURCE_NAME
    });

    return store;
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

QUnit.test("update", function (assert) {
    var done = assert.async();

    var store = createBreezeStoreWithDefaultEntityType();
    var manager = store.entityManager();

    manager.createEntity(DEFAULT_ENTITY_NAME, { id: 1, name: "foo" }, EntityState.Unchanged);

    store.update(1, { name: "bar" })
        .fail(createNoPasaran(assert), done)
        .done(function (key, values) {
            assert.equal(key, 1);

            assert.ok(manager.hasChanges());
            assert.equal(manager.getChanges()[0].entityAspect.entityState, EntityState.Modified);

            manager.fetchEntityByKey(DEFAULT_ENTITY_NAME, key, true)
                .then(function (result) {
                    assert.equal(result.entity.name, "bar");
                })
                .then(null, createNoPasaran(assert))
                .then(done, done);
        });
});

QUnit.test("update (autoCommit=true)", function (assert) {
    var done = assert.async();

    this.server.respondWith(function (request) {
        request.respond(202, { "Content-Type": "multipart/mixed; boundary=batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e", "DataServiceVersion":"3.0" }, "\
--batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e\r\n\
Content-Type: multipart/mixed; boundary=changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50\r\n\
\r\n\
--changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50\r\n\
Content-Type: application/http\r\n\
Content-Transfer-Encoding: binary\r\n\
\r\n\
HTTP/1.1 204 No Content\r\n\
Content-ID: 1\r\n\
\r\n\
\r\n\
--changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50--\r\n\
--batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e--");
    });

    var store = createBreezeStoreWithDefaultEntityType({ autoCommit: true });
    var manager = store.entityManager();

    manager.createEntity(DEFAULT_ENTITY_NAME, { id: 1, name: "foo" }, EntityState.Unchanged);

    store.update(1, { name: "bar" })
        .fail(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .fail(done)
        .done(function (key, values) {
            assert.ok(!manager.hasChanges());

            assert.equal(key, 1);
            assert.deepEqual(values, { name: "bar" });

            manager.fetchEntityByKey(DEFAULT_ENTITY_NAME, key, true)
                .then(function (result) {
                    assert.equal(result.entity.name, "bar");
                    assert.equal(result.entity.entityAspect.entityState, EntityState.Unchanged);
                })
                .catch(function () {
                    assert.ok(false, "Shouldn't reach this point");
                })
                .then(done, done);
        });
});

QUnit.test("insert", function (assert) {
    var done = assert.async();

    var store = createBreezeStoreWithDefaultEntityType();
    var manager = store.entityManager();

    store.insert({ id: 1, name: "foo" })
        .fail(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .done(function (values, id) {
            var changes;

            assert.equal(id, 1);

            // TODO: Since Breeze adds $entityRef prop to values object, so the assertion bellow will fail.
            // assert.deepEqual(values, { id: 1, name: "foo" });
            assert.equal(values.id, 1);
            assert.equal(values.name, "foo");

            assert.ok(manager.hasChanges());

            changes = manager.getChanges();
            assert.equal(changes.length, 1);
            assert.equal(changes[0].id, 1);
            assert.equal(changes[0].name, "foo");
            assert.equal(changes[0].entityAspect.entityState, EntityState.Added);
        })
        .always(done);
});

QUnit.test("insert (autoCommit=true)", function (assert) {
    var done = assert.async();

    this.server.respondWith(function (request) {
        request.respond(202, { "Content-Type": "multipart/mixed; boundary=batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e", "DataServiceVersion":"3.0" }, "\
--batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e\r\n\
Content-Type: multipart/mixed; boundary=changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50\r\n\
\r\n\
--changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50\r\n\
Content-Type: application/http\r\n\
Content-Transfer-Encoding: binary\r\n\
\r\n\
HTTP/1.1 201 Created\r\n\
Location: Service/Entity(1)\r\n\
Content-ID: 1\r\n\
Content-Type: application/json; odata=fullmetadata\r\n\
DataServiceVersion: 3.0\r\n\
\r\n\
{\r\n\
\"odata.metadata\":\"Service/$metadata#Entity/@Element\",\"odata.type\":\"Entity\",\"odata.id\":\"Service/Entity(1)\",\"id\":1,\"name\":\"foo\"\r\n\
}\r\n\
\r\n\
--changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50--\r\n\
--batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e--");
    });

    var store = createBreezeStoreWithDefaultEntityType({ autoCommit: true });
    var manager = store.entityManager();

    store.insert({ id: 1, name: "foo" })
        .fail(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .done(function (values, id) {

            assert.equal(id, 1);

            // TODO: Since Breeze adds $entityRef prop to values object, so the assertion bellow will fail.
            // assert.deepEqual(values, { id: 1, name: "foo" });
            assert.equal(values.id, 1);
            assert.equal(values.name, "foo");

            assert.ok(!manager.hasChanges());
        })
        .always(done);
});

QUnit.test("remove", function (assert) {
    var done = assert.async();

    var store = createBreezeStoreWithDefaultEntityType();
    var manager = store.entityManager();

    manager.createEntity(DEFAULT_ENTITY_NAME, { id: 1, name: "foo" }, EntityState.Unchanged);

    store.remove(1)
        .fail(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .done(function (id) {
            assert.equal(id, 1);

            assert.ok(manager.hasChanges());
            assert.equal(manager.getChanges()[0].id, 1);
            assert.equal(manager.getChanges()[0].entityAspect.entityState, EntityState.Deleted);
        })
        .always(done);
});

QUnit.test("remove (autoCommit=true)", function (assert) {
    var done = assert.async();

    this.server.respondWith(function (request) {
        request.respond(202, { "Content-Type": "multipart/mixed; boundary=batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e", "DataServiceVersion":"3.0" }, "\
--batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e\r\n\
Content-Type: multipart/mixed; boundary=changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50\r\n\
\r\n\
--changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50\r\n\
Content-Type: application/http\r\n\
Content-Transfer-Encoding: binary\r\n\
\r\n\
HTTP/1.1 204 No Content\r\n\
Content-ID: 1\r\n\
\r\n\
\r\n\
--changesetresponse_a0dab49c-f77f-4a53-b170-668f7c471a50--\r\n\
--batchresponse_687e5097-9ea0-4c2d-a82b-1bc9f6f39c1e--");
    });

    var store = createBreezeStoreWithDefaultEntityType({ autoCommit: true });
    var manager = store.entityManager();

    manager.createEntity(DEFAULT_ENTITY_NAME, { id: 1, name: "foo" }, EntityState.Unchanged);

    store.remove(1)
        .fail(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .done(function (id) {
            assert.equal(id, 1);

            assert.ok(!manager.hasChanges());
        })
        .always(done);
});

QUnit.test("error handling for load", function (assert) {
    var done = assert.async();

    this.server.respondWith([HTTP_STATUS_ERROR, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
        error: {
            code: "500",
            message: "Simulated error"
        }
    })]);

    var log = [];
    var store = createBreezeStore({
        errorHandler: function () { log.push("optional"); }
    });

    dataNs.errorHandler = function () {
        log.push("global");
    };

    store.load()
        .done(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .fail(function () {
            log.push("direct");
        })
        .always(function () {
            assert.deepEqual(log, ["optional", "global", "direct"]);
        })
        .always(function () {
            dataNs.errorHandler = null;
        })
        .always(done);
});

QUnit.test("error handling for byKey", function (assert) {
    var done = assert.async();

    this.server.respondWith([HTTP_STATUS_ERROR, ODATA_V2_RESPONSE_HEADERS, "Simulated error"]);

    var log = [];
    var store = createBreezeStore({
        key: "Id",
        errorHandler: function () {
            log.push("optional");
        }
    });

    dataNs.errorHandler = function () {
        log.push("global");
    };

    store.byKey(1)
        .done(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .fail(function () {
            log.push("direct");
        })
        .always(function () {
            assert.deepEqual(log, ["optional", "global", "direct"]);
        })
        .always(function () {
            dataNs.errorHandler = null;
        })
        .always(done);
});

QUnit.test("error handling for update", function (assert) {
    var done = assert.async();

    this.server.respondWith([HTTP_STATUS_ERROR, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
        error: {
            code: "500",
            message: "Simulated error"
        }
    })]);

    var log = [];
    var store = createBreezeStoreWithDefaultEntityType({
        autoCommit: true,
        errorHandler: function (error) {
            log.push(["optional", error.message]);
        }
    });

    dataNs.errorHandler = function (error) {
        log.push(["global", error.message]);
    };

    store.update(0, { name: "bar" })
        .done(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .fail(function (error) {
            log.push(["direct", error.message]);
        })
        .always(function () {
            assert.deepEqual(log, [
                ["optional", "Simulated error; "],
                ["global", "Simulated error; "],
                ["direct", "Simulated error; "]
            ]);
        })
        .always(function () {
            dataNs.errorHandler = null;
        })
        .always(done);
});

QUnit.test("error handling for insert", function (assert) {
    var done = assert.async();

    this.server.respondWith([HTTP_STATUS_ERROR, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
        error: {
            code: "500",
            message: "Simulated error"
        }
    })]);

    var log = [];
    var store = createBreezeStoreWithDefaultEntityType({
        autoCommit: true,
        errorHandler: function (error) {
            log.push(["optional", error.message]);
        }
    });

    dataNs.errorHandler = function (error) {
        log.push(["global", error.message]);
    };

    store.insert({ id: 1, name: "foo" })
        .done(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .fail(function (error) {
            log.push(["direct", error.message]);
        })
        .always(function () {
            assert.deepEqual(log, [
                ["optional", "Simulated error; "],
                ["global", "Simulated error; "],
                ["direct", "Simulated error; "]
            ]);
        })
        .always(function () {
            dataNs.errorHandler = null;
        })
        .always(done);
});

QUnit.test("error handling for remove", function (assert) {
    var done = assert.async();

    this.server.respondWith([HTTP_STATUS_ERROR, ODATA_V2_RESPONSE_HEADERS, JSON.stringify({
        error: {
            code: "500",
            message: "Simulated error"
        }
    })]);

    var log = [];
    var store = createBreezeStoreWithDefaultEntityType({
        autoCommit: true,
        errorHandler: function (error) {
            log.push(["optional", error.message]);
        }
    });

    dataNs.errorHandler = function (error) {
        log.push(["global", error.message]);
    };

    store.remove(1)
        .done(function () {
            assert.ok(false, "Shouldn't reach this point");
        })
        .fail(function (error) {
            log.push(["direct", error.message]);
        })
        .always(function () {
            assert.deepEqual(log, [
                ["optional", "Simulated error; "],
                ["global", "Simulated error; "],
                ["direct", "Simulated error; "]
            ]);
        })
        .always(function () {
            dataNs.errorHandler = null;
        })
        .always(done);
});