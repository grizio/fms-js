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
          for (let i = 0, c = this._onStateChangedListeners.length; i < c; i++) {
            this._onStateChangedListeners[i](oldState, this._currentState)
          }
        }

        // We clear functions to execute from current FSM to avoid collision if fire is launched by one of them.
        const toExecute = this._toExecute
        this._toExecute = []
        for (let i = 0, c = toExecute.length; i < c; i++) {
          toExecute[i]()
        }
        return this
      }

      execute(callback) {
        this._toExecute.push(callback)
        return this
      }

      describe(stringify) {
        const states = []
        for (let state in this._states) {
          if (this._states.hasOwnProperty(state)) {
            states.push(this._states[state].describe())
          }
        }
        return JSON.stringify({
          "Current state": {
            "state": this._currentState,
            "data": this._currentData
          },
          "onStateChanged listeners": this._onStateChangedListeners.length,
          "states": states
        }, null, ' ')
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

      describe() {
        const handlers = []
        for (let handler in this._handlers) {
          if (this._handlers.hasOwnProperty(handler)) {
            handlers.push(handler)
          }
        }

        return {
          "name": this._name,
          "handlers": handlers
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
        return this
      }

      when(stateName, stateInitializer) {
        const state = new StateBuilder(stateName, this);
        stateInitializer(state);
        this._states[stateName] = state;
        return this
      }

      onStateChanged(listener) {
        this._onStateChangedListeners.push(listener);
        return this
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

        // Adds custom functions set in initializer into returned FSM
        for (let attr in this) {
          if (this.hasOwnProperty(attr) && attr.charAt(0) != '_') {
            fsm[attr] = this[attr]
          }
        }

        return Object.seal(fsm)
      }
    }

    class StateBuilder {
      constructor(name) {
        this._name = name
        this._handlers = {}
      }

      on(eventName, callback) {
        this._handlers[eventName] = callback
        return this
      }

      build(fsm) {
        return Object.seal(new State(this._name, fsm, this._handlers))
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
