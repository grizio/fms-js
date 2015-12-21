(function(k) {
  (function(fsm) {
    'use strict'

    class FSM {
      constructor(initialState, initialData, onStateChangedListeners) {
        this._currentState = initialState
        this._currentData = initialData
        this._onStateChangedListeners = onStateChangedListeners
        this._states = null // set after in builder.
        this._toExecute = []
      }

      fire( /* dynamic arguments */ ) {
        const oldState = this._currentState
        const result = this._states[this._currentState].fire(Array.prototype.slice.call(arguments), this._currentData)
        if (result == null || result.length < 2) {
          throw 'All event handlers must return the next state and data. Error for event "' + arguments[0] + '" on state "' + oldState + '"'
        }
        this._currentState = result[0]
        this._currentData = result[1]

        if (oldState != this._currentState) {
          for (var i = 0, c = this._onStateChangedListeners.length; i < c; i++) {
            this._onStateChangedListeners[i](oldState, this._currentState)
          }
        }

        // We clear functions to execute from current FSM to avoid collision if fire is launched by one of them.
        const toExecute = this._toExecute
        this._toExecute = []
        for (var i = 0, c = toExecute.length; i < c; i++) {
          toExecute[i]()
        }
      }

      execute(callback) {
        this._toExecute.push(callback)
      }
    }

    class State {
      constructor(name, fsm, handlers) {
        this._name = name
        this._fsm = fsm
        this._handlers = handlers
      }

      fire(args, currentData) {
        if (args == null || args.length < 1) {
          throw 'The function fire must be called at least with the event name'
        }
        const eventName = args[0]
        const innerArgs = [currentData].concat(args.slice(1))
        if (eventName in this._handlers) {
          return this._handlers[eventName].apply(this._fsm, innerArgs)
        } else {
          throw 'The event "' + eventName + '" does not exist in state "' + this._name + '"'
        }
      }
    }

    class FSMBuilder {
      constructor() {
        this._initialState = null
        this._initialData = null
        this._states = {}
        this._onStateChangedListeners = []
      }

      startWith(initialState, initialData) {
        this._initialState = initialState
        this._initialData = initialData
      }

      when(stateName, stateInitializer) {
        const state = new StateBuilder(stateName, this);
        stateInitializer(state);
        this._states[stateName] = state;
      }

      onStateChanged(listener) {
        this._onStateChangedListeners.push(listener);
      }

      build() {
        const fsm = new FSM(this._initialState, this._initialData, this._onStateChangedListeners)
        const states = {}
        for (let state in this._states) {
          if (this._states.hasOwnProperty(state)) {
            states[state] = this._states[state].build(fsm)
          }
        }
        fsm._states = states
        return fsm
      }
    }

    class StateBuilder {
      constructor(name) {
        this._name = name
        this._handlers = {}
      }

      on(eventName, callback) {
        this._handlers[eventName] = callback;
      }

      build(fsm) {
        return new State(this._name, fsm, this._handlers)
      }
    }

    function create(initializer) {
      const builder = new FSMBuilder()
      initializer(builder)
      return builder.build()
    }

    k.fsm.create = create
  })(k.fsm || (k.fsm = {}))
})(window.k || (window.k = {}))
