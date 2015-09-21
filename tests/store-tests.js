QUnit.module("[Store-tests]");
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