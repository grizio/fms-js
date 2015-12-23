(function(k) {
  (function(fsm) {
    'use strict'

    /**
     * This class is the built class of the FSM.
     * It provides a fire method to execute a defined event if the current state accepts it.
     * @final
     */
    class FSM {
      /**
       * Constructs the FSM with default values.
       * <tt>states</tt> is not initialized here, because we have a bidirectional dependency
       * between <tt>FSM</tt> and <tt>State</tt>.
       *
       * This method is not available outside the module.
       *
       * @protected
       * @param {string} initialState - The initial state of the FSM
       * @param {*} initialData - The initial data of the FSM
       * @param {Array} onStateChangedListeners - Listeners of state changes
       */
      constructor(initialState, initialData, onStateChangedListeners) {
        this._currentState = initialState
        this._currentData = initialData
        this._onStateChangedListeners = onStateChangedListeners
        this._states = null // set after in builder.
        this._toExecute = []
        this._toExecuteOut = []
      }

      /**
       * Fires the event with given arguments.
       * This method accepts at least one argument, the event name.
       * All other arguments will be arguments for the handler of the event in the given state.
       *
       * @public
       * @param arguments The first one (mandatory) is the event name, other arguments of handler.
       * @return this FSM (chained calls)
       */
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
        const toExecuteOut = this._toExecuteOut

        this._toExecute = []
        this._toExecuteOut = []

        for (let i = 0, c = toExecute.length; i < c; i++) {
          toExecute[i]()
        }

        for (let i = 0, c = toExecuteOut.length; i < c; i++) {
          setTimeout(toExecuteOut[i], 0)
        }
        return this
      }

      /**
       * Asks the FSM to postpone the execution of the given function after the end of the current event handler.
       * This method should be executed inside a handler only.
       *
       * There will not be any other function called before the end of fire.
       * It will execute the function inside the current execution stack,
       * so you should not call another <tt>fire</tt> to prevent stack overflow.
       * In this case, <tt>executeOut</tt> could help you.
       *
       * If this function is called several times, then all functions will be called in the same order.
       *
       * @protected
       * @param The function to call
       * @return this FSM (chained calls)
       * @see {@link executeOut}
       */
      execute(callback) {
        this._toExecute.push(callback)
        return this
      }

      /**
       * Asks the FSM to postpone the execution of the given function after the end of the current event handler.
       * This method should be executed inside a handler only.
       *
       * There will not have a stack overflow because of inifinite call of <tt>fire</tt>.
       * It will execute the function outside the current execution stack with a <tt>setTimeout</tt>,
       * so there is no guarantee another function is called before the end of fire and the beginning of the given function.
       * In this case, <tt>execute</tt> could help you.
       *
       * If this function is called several times, then all functions will be called without guarantee of the order.
       *
       * @protected
       * @param The function to call
       * @return this FSM (chained calls)
       *
       * @see {@link execute}
       */
      executeOut(callback) {
        this._toExecuteOut.push(callback)
        return this
      }

      /**
       * Returns a clean version of this FSM structure.
       *
       * @public
       * @param {boolean} [stringify=true] - If <tt>true</tt>, returns a string version with <tt>JSON.stringify</tt> of the object descriptor, otherwise the plain object.
       */
      describe(stringify) {
        const states = []
        for (let state in this._states) {
          if (this._states.hasOwnProperty(state)) {
            states.push(this._states[state].describe())
          }
        }
        const result = {
          "Current state": {
            "state": this._currentState,
            "data": this._currentData
          },
          "onStateChanged listeners": this._onStateChangedListeners.length,
          "states": states
        }
        if (stringify == null || stringify) {
          return JSON.stringify(result, null, ' ')
        } else {
          return Object.freeze(result)
        }
      }
    }

    /**
     * This class is the built class of a state of the FSM.
     * @final
     */
    class State {
      /**
       * Constructs the state with value for all attributes.
       *
       * @protected
       * @param {string} name - The state name
       * @param {FSM} fsm - The parent FSM
       * @param {Object} handlers - The handler map
       */
      constructor(name, fsm, handlers) {
        this._name = name
        this._fsm = fsm
        this._handlers = handlers
      }

      /**
       * Fires an event.
       *
       * @protected
       * @param {Array} args - <tt>arguments</tt> from <tt>FSM.fire</tt> function.
       * @param {*} currentData - The current data of FSM.
       * @return The new FSM state returned from the state handler.
       */
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

      /**
       * Returns a clean version of this FSM structure.
       *
       * @protected
       */
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

    /**
     * Builder of a FSM.
     * It provides methods to build the FSM and initialize it.
     *
     * @final
     */
    class FSMBuilder {
      /**
       * Creates the builder and initializes attributes.
       *
       * @protected
       */
      constructor() {
        this._initialState = null
        this._initialData = null
        this._states = {}
        this._onStateChangedListeners = []
      }

      /**
       * Sets the initial state of the FSM.
       * This method can be called several times.
       * The last call will be used for built FSM.
       * This function can be called any time, the state does not need to exist to be used.
       *
       * @public
       * @param {string} initialState - The initial state name
       * @param {*} initialData - The initial state data
       * @return this FSM builder (chained calls)
       */
      startWith(initialState, initialData) {
        this._initialState = initialState
        this._initialData = initialData
        return this
      }

      /**
       * Initializes a new State for this FSM.
       *
       * @public
       * @param {string} stateName - The state name
       * @param {function} stateInitializer - The initializer function for the created state
       * @return this FSM builder (chained calls)
       */
      when(stateName, stateInitializer) {
        const state = new StateBuilder(stateName, this);
        stateInitializer(state);
        this._states[stateName] = state;
        return this
      }

      /**
       * Adds an observer to listen of state changes.
       * Listeners will be triggered only when the state name change.
       * Two parameters will be provided to the listener, the old state name and the new state name. No data will be passed.
       *
       * @public
       * @param {function} listener - The state change listener
       * @return this FSM builder (chained calls)
       */
      onStateChanged(listener) {
        this._onStateChangedListeners.push(listener);
        return this
      }

      /**
       * Builds the FSM.
       * It will return a sealed <tt>FSM</tt> to avoid any further changes.
       *
       * @protected
       * @return The built FSM
       */
      _build() {
        const fsm = new FSM(this._initialState, this._initialData, this._onStateChangedListeners)
        const states = {}
        for (let state in this._states) {
          if (this._states.hasOwnProperty(state)) {
            states[state] = this._states[state]._build(fsm)
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

    /**
     * FSM State builder
     * It will provide methods to build a state of a FSM.
     *
     * @final
     */
    class StateBuilder {
      constructor(name) {
        this._name = name
        this._handlers = {}
      }

      /**
       * Set the handler for the given event on this state.
       *
       * @param {string} eventName - The event name
       * @param {function} callback - The called function, parameters from <tt>FSM.fire</tt> wiil be passed through this callback.
       * @return this FSM state builder (chained calls)
       */
      on(eventName, callback) {
        this._handlers[eventName] = callback
        return this
      }

      /**
       * Build the FSM state.
       * It will return a sealed <tt>FSMState</tt> to avoid any further changes.
       *
       * @protected
       * @return The built FSM state
       */
      _build(fsm) {
        return Object.seal(new State(this._name, fsm, this._handlers))
      }
    }

    /**
     * Creates a new FSM and initializes it.
     *
     * @public
     * @param {function} initializer - The FSM initializer, the only given parameter is the <tt>FSMBuilder</tt>
     * @return {FSM} The built <tt>FSM</tt>, it will be sealed to avoid further changes.
     */
    function create(initializer) {
      const builder = new FSMBuilder()
      initializer(builder)
      return builder._build()
    }

    // Public interface
    k.fsm.create = create
  })(k.fsm || (k.fsm = {}))
})(window.k || (window.k = {}))
