(function ($, DX, undefined) {
    var breeze = window.breeze;

    var operatorMap = {
        "=": "eq",
        "<>": "ne"
    },
        dataNs = DX.data,
        utilsNs = DX.utils;

    function createBreezeQuery(entityManager, resourceNameOrQuery, queryOptions, tasks) {
        if (!window.breeze)
            throw Error("breezejs library is required");

        tasks = tasks || [];
        queryOptions = queryOptions || {};

        function formatSortParam(field, desc) {
            return desc ? field + " desc" : field;
        }

        function createDerivedQuery(action, params) {
            return createBreezeQuery(entityManager, resourceNameOrQuery, queryOptions, tasks.concat([
                { action: action, params: params }
            ]));
        }

        function compileCriteria(criteria) {
            var Predicate = breeze.Predicate;

            function translateBinaryOperator(op) {
                return operatorMap[op] || op;
            }

            function compileBinary(criteria) {
                criteria = dataNs.utils.normalizeBinaryCriterion(criteria);

                var operator = criteria[1].toLowerCase(),
                    shouldNegate = false,
                    result;

                if (operator === "notcontains") {
                    operator = "contains";
                    shouldNegate = true;
                }

                result = new Predicate(
                    criteria[0],
                    translateBinaryOperator(operator),
                    criteria[2]
                    );

                return shouldNegate ? Predicate.not(result) : result;
            }

            function compileGroup(criteria) {
                var groupOperands = [],
                    groupOperator,
                    nextGroupOperator;

                $.each(criteria, function () {
                    if ($.isArray(this)) {
                        if (groupOperands.length > 1 && nextGroupOperator !== groupOperator)
                            throw Error("Mixing of and/or is not allowed inside a single group");

                        groupOperator = nextGroupOperator;
                        groupOperands.push(compileCore(this));
                        nextGroupOperator = "and";
                    } else {
                        nextGroupOperator = /and|&/i.test(this) ? "and" : "or";
                    }

                });

                return groupOperands.length < 2
                    ? groupOperands[0]
                    : Predicate[groupOperator].apply(null, groupOperands);
            }

            function compileCore(criteria) {
                return $.isArray(criteria[0])
                    ? compileGroup(criteria)
                    : compileBinary(criteria);
            }

            return compileCore(criteria);
        }

        function prepareEntityQuery(tasks) {
            var entityQuery = resourceNameOrQuery instanceof breeze.EntityQuery
                ? resourceNameOrQuery
                : new breeze.EntityQuery(resourceNameOrQuery);

            $.each(tasks, function () {
                entityQuery = entityQuery[this.action].apply(entityQuery, this.params);
            });

            return entityQuery;
        }

        function errorHandler(error) {
            var customHandler = queryOptions.errorHandler;
            if (customHandler)
                customHandler(error);
            dataNs._errorHandler(error);
        }

        // API

        function sortBy(field, desc) {
            return createDerivedQuery("orderBy", [formatSortParam(field, desc)]);
        }

        function thenBy(field, desc) {
            var lastTask = tasks[tasks.length - 1];
            if (!lastTask || lastTask.action !== "orderBy")
                throw Error("Cannot be called before sortBy");

            var clonedTasks = tasks.slice(0);
            clonedTasks[clonedTasks.length - 1].params[0] += "," + formatSortParam(field, desc);

            return createBreezeQuery(entityManager, resourceNameOrQuery, queryOptions, clonedTasks);
        }

        function filter(criteria) {
            if (!$.isArray(criteria))
                criteria = $.makeArray(arguments);
            return createDerivedQuery("where", [compileCriteria(criteria)]);
        }

        function select(expr) {
            if (!$.isArray(expr))
                expr = $.makeArray(arguments);

            var propertiesToSelect = [],
                propertiesToExpand = [];

            $.each(expr, function () {
                var term = String(this);
                var path = term.split(".");

                propertiesToSelect.push(term);
                if (path.length > 1) {
                    path.pop();
                    propertiesToExpand.push(path.join("."));
                }
            });

            var q = createDerivedQuery("select", [propertiesToSelect.join()]);
            if (propertiesToExpand.length)
                q = q.expand(propertiesToExpand);
            return q;
        }

        function queryHasExpandClause() {
            return resourceNameOrQuery instanceof breeze.EntityQuery
                && resourceNameOrQuery.expandClause && $.isArray(resourceNameOrQuery.expandClause.propertyPaths);
        }

        function expand(expr) {
            if (!$.isArray(expr))
                expr = $.makeArray(arguments);

            var existingProperties = !queryHasExpandClause()
                ? []
                : resourceNameOrQuery.expandClause.propertyPaths;
            var propertiesToExpand = $.grep(expr, function (name, index) {
                if ($.inArray(name, expr, index + 1) > -1)
                    return false;
                if (existingProperties.length && $.inArray(name, existingProperties) > -1)
                    return false;
                return true;
            }).concat(existingProperties);

            return createDerivedQuery("expand", [propertiesToExpand.join()]);
        }

        function enumerate() {
            var d = $.Deferred().fail(errorHandler),
                entityQuery = prepareEntityQuery(tasks);

            if (queryOptions.requireTotalCount)
                entityQuery = entityQuery.inlineCount(true);

            entityManager
                .executeQuery(entityQuery)
                .then(function (obj) {
                    var extra;

                    if (utilsNs.isNumber(obj.inlineCount))
                        extra = { totalCount: obj.inlineCount };

                    d.resolve(obj.results, extra);
                })
                .fail($.proxy(d.reject, d));

            return d.promise();
        }


        function count() {
            var d = $.Deferred().fail(errorHandler),
                filteredTasks,
                entityQuery;

            filteredTasks = $.grep(tasks, function (task) {
                return !/select|orderBy|take|skip/i.test(task.action);
            });

            entityQuery = prepareEntityQuery(filteredTasks);
            entityQuery = entityQuery
                .inlineCount(true)
                .take(0);

            entityManager
                .executeQuery(entityQuery)
                .then(function (obj) {
                    d.resolve(obj.inlineCount);
                })
                .fail($.proxy(d.reject, d));

            return d.promise();
        }

        function slice(skip, take) {
            var newTasks = [];
            if (skip)
                newTasks.push({ action: "skip", params: [skip] });
            if (take)
                newTasks.push({ action: "take", params: [take] });
            return createBreezeQuery(entityManager, resourceNameOrQuery, queryOptions, tasks.concat(newTasks));
        }

        return {
            enumerate: enumerate,
            count: count,
            slice: slice,
            sortBy: sortBy,
            thenBy: thenBy,
            filter: filter,
            select: select,
            expand: expand,
            sum: DX.abstract,
            min: DX.abstract,
            max: DX.abstract,
            avg: DX.abstract,
            groupBy: DX.abstract,
            aggregate: DX.abstract
        };
    }


    function normalizeOptions(options) {
        var entityManager,
            resourceName,
            entityQuery;

        if (options instanceof breeze.EntityManager) {
            entityManager = options;
        } else if ($.type(options) === "string") {
            entityManager = new breeze.EntityManager(options);
        } else if (options.serviceName) {
            entityManager = new breeze.EntityManager(options.serviceName);
            delete options.serviceName;
        } else {
            entityManager = options.entityManager;
            delete options.entityManager;
        }

        resourceName = arguments[1] || options.resourceName;
        entityQuery = arguments[2] || options.entityQuery;

        options = $.isPlainObject(options) ? options : {};

        if (!entityManager)
            throw Error("Missing required argument: entityManager");
        if (!resourceName)
            throw Error("Missing required argument: resourceName");

        return $.extend(options, {
            entityManager: entityManager,
            resourceName: resourceName,
            entityQuery: entityQuery || new breeze.EntityQuery(resourceName),
            preferLocal: options.preferLocal || true,
            autoCommit: options.autoCommit || false
        });
    }

    var BreezeStore = dataNs.Store.inherit({
        ctor: function (options) {
            if (!window.breeze)
                throw Error("breezejs library is required");

            options = normalizeOptions.apply(this, arguments);

            this.callBase(options);

            this._autoCommit = options.autoCommit;
            this._resourceName = options.resourceName;
            this._userQuery = options.entityQuery;
            this._entityManager = options.entityManager;
        },

        _customLoadOptions: function () {
            return ["expand", "entityQuery"];
        },

        _resolveUserQuery: function (loadOptions) {
            var result = (loadOptions && loadOptions.entityQuery) || this._userQuery;
            return result && result.from(this._resourceName);
        },

        createQuery: function (loadOptions) {
            loadOptions = loadOptions || {};
            var userQuery = this._resolveUserQuery(loadOptions);
            var query = dataNs.queryImpl.breeze(this._entityManager, userQuery || this._resourceName, {
                errorHandler: this._errorHandler,
                requireTotalCount: loadOptions.requireTotalCount
            });
            if (loadOptions.expand)
                query = query.expand(loadOptions.expand);
            return query;
        },

        key: function () {
            var metadata = this._entityManager.metadataStore;
            if (metadata.isEmpty())
                return this._key;
            var key = $.map(metadata.getEntityType(metadata.getEntityTypeNameForResourceName(this._resourceName)).keyProperties, function (item) {
                return item.nameOnServer;
            });
            return key.length > 1 ? key : key[0];
        },

        _byKeyImpl: function (key) {
            this._requireKey();

            var d = $.Deferred(),
                keyExpr = this.key(),
                predicate,
                entityQuery = this._resolveUserQuery() || new breeze.EntityQuery(this._resourceName);

            predicate = !$.isArray(keyExpr)
                ? new breeze.Predicate(keyExpr, "eq", key)
                : breeze.Predicate.and.apply(null, $.map(keyExpr, function (item) {
                    return new breeze.Predicate(item, "eq", key[item]);
                }));

            this._entityManager
                .executeQuery(entityQuery.where(predicate))
                .then(function (result) {
                    d.resolve(result.results[0]);
                })
                .fail($.proxy(d.reject, d));

            return d.promise();
        },

        _updateImpl: function (key, values) {
            var d = $.Deferred(),
                that = this;
            this._entityManager
                .fetchEntityByKey(this.entityType(), key, true)
                .then(function (result) {
                    var entity = result.entity;
                    $.each(values, function (name, value) {
                        entity.setProperty(name, value);
                    });
                    if (that._autoCommit) {
                        that._commit([entity])
                            .done(function (saveResult) {
                                d.resolve(that.keyOf(saveResult.entities[0]), values);
                            })
                            .fail($.proxy(d.reject, d));
                    } else {
                        d.resolve(that.keyOf(result.entity), values);
                    }
                })
                .fail($.proxy(d.reject, d));
            return d.promise();
        },

        _insertImpl: function (values) {
            var d = $.Deferred(),
                that = this,
                entity;

            entity = this._entityManager.createEntity(this.entityType(), values);
            if (this._autoCommit) {
                this._commit([entity])
                    .done(function (saveResult) {
                        d.resolve(values, that.keyOf(saveResult.entities[0]));
                    })
                    .fail($.proxy(d.reject, d));
            } else {
                d.resolve(values, this.keyOf(entity));
            }
            return d.promise();
        },

        _removeImpl: function (key) {
            var d = $.Deferred(),
                that = this;
            this._entityManager
                .fetchEntityByKey(this.entityType(), key, true)
                .then(function (result) {
                    var entity = result.entity;
                    entity.entityAspect.setDeleted();
                    if (that._autoCommit) {
                        that._commit([entity])
                            .done(function (saveResult) {
                                d.resolve(that.keyOf(saveResult.entities[0]));
                            })
                            .fail($.proxy(d.reject, d));
                    } else {
                        d.resolve(that.keyOf(result.entity));
                    }
                })
                .fail($.proxy(d.reject, d));
            return d.promise();
        },

        _commit: function (entities) {
            var d = $.Deferred();

            this._entityManager
                .saveChanges(entities)
                .then(function (saveResult) {
                    d.resolve(saveResult);
                })
                .fail($.proxy(d.reject, d));
            return d.promise();
        },

        entityType: function () {
            return this._entityManager.metadataStore.getEntityTypeNameForResourceName(this._resourceName);
        },

        entityManager: function () {
            return this._entityManager;
        }
    });

    dataNs.BreezeStore = BreezeStore;
    dataNs.queryImpl.breeze = createBreezeQuery;
})(jQuery, DevExpress);