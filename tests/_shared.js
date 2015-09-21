    var dataNs = DX.data,
        breezeQuery = dataNs.queryImpl.breeze,
        BreezeStore = dataNs.BreezeStore,

        DataType = breeze.DataType,
        DataService = breeze.DataService,
        EntityQuery = breeze.EntityQuery,
        EntityManager = breeze.EntityManager;

    var HTTP_STATUS_OK = 200;
    var HTTP_STATUS_ERROR = 500;
    var ODATA_V2_RESPONSE_HEADERS = {
        "DataServiceVersion": 2.0,
        "Content-Type": "application/json;charset=utf-8"
    };

    breeze.config.initializeAdapterInstances({
        dataService: "OData"
    });