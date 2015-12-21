'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (k) {
  (function (fsm) {
    'use strict';

    var FSM = (function () {
      function FSM(initialState, initialData, onStateChangedListeners) {
        _classCallCheck(this, FSM);

        this._currentState = initialState;
        this._currentData = initialData;
        this._onStateChangedListeners = onStateChangedListeners;
        this._states = null; // set after in builder.
        this._toExecute = [];
      }

      _createClass(FSM, [{
        key: 'fire',
        value: function fire() /* dynamic arguments */{
          var oldState = this._currentState;
          var result = this._states[this._currentState].fire(Array.prototype.slice.call(arguments), this._currentData);
          if (result == null || result.length < 2) {
            throw 'All event handlers must return the next state and data. Error for event "' + arguments[0] + '" on state "' + oldState + '"';
          }
          this._currentState = result[0];
          this._currentData = result[1];

          if (oldState != this._currentState) {
            for (var i = 0, c = this._onStateChangedListeners.length; i < c; i++) {
              this._onStateChangedListeners[i](oldState, this._currentState);
            }
          }

          (function (callbacks) {
            // We launch callback functions after the end of the fire.
            setTimeout(function () {
              for (var i = 0, c = callbacks.length; i < c; i++) {
                callbacks[i]();
              }
            }, 1);
          })(this._toExecute);

          this._toExecute = [];
        }
      }, {
        key: 'execute',
        value: function execute(callback) {
          this._toExecute.push(callback);
        }
      }]);

      return FSM;
    })();

    var State = (function () {
      function State(name, fsm, handlers) {
        _classCallCheck(this, State);

        this._name = name;
        this._fsm = fsm;
        this._handlers = handlers;
      }

      _createClass(State, [{
        key: 'fire',
        value: function fire(args, currentData) {
          if (args == null || args.length < 1) {
            throw 'The function fire must be called at least with the event name';
          }
          var eventName = args[0];
          var innerArgs = [currentData].concat(args.slice(1));
          if (eventName in this._handlers) {
            return this._handlers[eventName].apply(this._fsm, innerArgs);
          } else {
            throw 'The event "' + eventName + '" does not exist in state "' + this._name + '"';
          }
        }
      }]);

      return State;
    })();

    var FSMBuilder = (function () {
      function FSMBuilder() {
        _classCallCheck(this, FSMBuilder);

        this._initialState = null;
        this._initialData = null;
        this._states = {};
        this._onStateChangedListeners = [];
      }

      _createClass(FSMBuilder, [{
        key: 'startWith',
        value: function startWith(initialState, initialData) {
          this._initialState = initialState;
          this._initialData = initialData;
        }
      }, {
        key: 'when',
        value: function when(stateName, stateInitializer) {
          var state = new StateBuilder(stateName, this);
          stateInitializer(state);
          this._states[stateName] = state;
        }
      }, {
        key: 'onStateChanged',
        value: function onStateChanged(listener) {
          this._onStateChangedListeners.push(listener);
        }
      }, {
        key: 'build',
        value: function build() {
          var fsm = new FSM(this._initialState, this._initialData, this._onStateChangedListeners);
          var states = {};
          for (var state in this._states) {
            if (this._states.hasOwnProperty(state)) {
              states[state] = this._states[state].build(fsm);
            }
          }
          fsm._states = states;
          return fsm;
        }
      }]);

      return FSMBuilder;
    })();

    var StateBuilder = (function () {
      function StateBuilder(name) {
        _classCallCheck(this, StateBuilder);

        this._name = name;
        this._handlers = {};
      }

      _createClass(StateBuilder, [{
        key: 'on',
        value: function on(eventName, callback) {
          this._handlers[eventName] = callback;
        }
      }, {
        key: 'build',
        value: function build(fsm) {
          return new State(this._name, fsm, this._handlers);
        }
      }]);

      return StateBuilder;
    })();

    function create(initializer) {
      var builder = new FSMBuilder();
      initializer(builder);
      return builder.build();
    }

    k.fsm.create = create;
  })(k.fsm || (k.fsm = {}));
})(window.k || (window.k = {}));