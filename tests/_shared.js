var DX = DevExpress;
var dataNs = DX.data,
    breezeQuery = dataNs.queryImpl.breeze,
    BreezeStore = dataNs.BreezeStore,

    DataType = breeze.DataType,
    DataService = breeze.DataService,
    EntityState = breeze.EntityState,
    EntityQuery = breeze.EntityQuery,
    EntityManager = breeze.EntityManager;

var HTTP_STATUS_OK = 200;
var HTTP_STATUS_ACCEPTED = 202;
var HTTP_STATUS_ERROR = 500;

var ODATA_V2_RESPONSE_HEADERS = {
    "DataServiceVersion": 2.0,
    "Content-Type": "application/json;charset=utf-8"
};

var DEFAULT_ENTITY_NAME = "Entity",
    DEFAULT_SERVICE_NAME = "Service",
    DEFAULT_RESOURCE_NAME = "Entities";

function createEntityManager() {
    return new EntityManager({
        dataService: new DataService({
            serviceName: DEFAULT_SERVICE_NAME,
            hasServerMetadata: false
        })
    });
}

function createNoPasaran(assert) {
    return function () {
        assert.ok(false, "Shouldn't reach this point")
    };
}

function toBreezeInt32(value) {
    return {
        value: value,
        dataType: DataType.Int32
    };
}

breeze.config.initializeAdapterInstance('dataService', 'webApiOData', true);
