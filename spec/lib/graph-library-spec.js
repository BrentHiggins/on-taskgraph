// Copyright 2016, EMC, Inc.

'use strict';

describe('Graph Library', function () {
    var di = require('di');
    var core = require('on-core')(di, __dirname);

    var loader,
        store,
        TaskGraph,
        taskLibrary,
        env,
        Promise,
        task;

    function findAllValues(obj) {
        var allValues = _.map(obj, function(v) {
            if (v !== null && typeof v === 'object') {
                return findAllValues(v);
            } else {
                return v;
            }
        });
        return _.flattenDeep(allValues);
    }

    before(function() {
        //This is time-consuming as some many injectables need be setup, so adding more timeout
        this.timeout(5000);
        helper.setupInjector([
            core.workflowInjectables,
            require('on-tasks').injectables,
            helper.require('/lib/loader')
        ]);
        TaskGraph = helper.injector.get('TaskGraph.TaskGraph');
        loader = helper.injector.get('TaskGraph.DataLoader');
        store = helper.injector.get('TaskGraph.Store');
        taskLibrary = helper.injector.get('Task.taskLibrary');
        env = helper.injector.get('Services.Environment');
        Promise = helper.injector.get('Promise');
        task = helper.injector.get('Task.Task');
        sinon.stub(store, 'getTaskDefinition', function(injectableName) {
            return Promise.resolve(_.find(taskLibrary, function(t) {
                return t.injectableName === injectableName;
            }));
        });
        sinon.stub(env, 'get').resolves({});
        sinon.stub(task.prototype, 'getSkuId').resolves({});
        return helper.injector.get('Services.Task').start();
    });

    it("should validate all existing graphs not requiring user input for null values", function() {
        //There may be a lot graph need be validated, so this test case may be very time consuming
        this.timeout(8000);
        return Promise.map(loader.graphLibrary, function(_graph) {
            if (_.isEmpty(_graph.options)) {
                // Only validate tasks that don't explicitly have blanks
                // in their definitions (to be filled in by users)
                var skip = _.some(_graph.tasks, function(task) {
                    if (task.taskName) {
                        var _task = _.find(taskLibrary, function(t) {
                            return t.injectableName === task.taskName;
                        });
                        expect(_task, task.taskName).to.exist;
                        var options = _task.options;
                        return _.contains(findAllValues(options, null));
                    } else if (task.taskDefinition) {
                        return _.contains(findAllValues(task.taskDefinition.options), null);
                    }
                });
                if (!skip) {
                    return TaskGraph.create(
                        'default',
                        {
                            definition: _graph,
                            context: {
                                target: "123"
                            }
                        }
                    );
                }
            } else {
                // Only validate tasks that don't explicitly have blanks
                // in their definitions (to be filled in by users)
                if (!_.contains(findAllValues(_graph.options), null)) {
                    return TaskGraph.create(
                        'default',
                        {
                            definition: _graph,
                            context: {
                                target: "123"
                            }
                        }
                    );
                }
            }
        });
    });
});
