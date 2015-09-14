$(function () {
    QUnit.test("exists", function (assert) {
        assert.ok("breeze" in DevExpress.data.queryImpl);
    });
});