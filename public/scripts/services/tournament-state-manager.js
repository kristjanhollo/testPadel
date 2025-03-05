// public/scripts/services/tournament-state-manager.js

/**
 * Tournament State Manager
 * Centralized state management with publish/subscribe pattern
 */
class TournamentStateManager {
  constructor() {
    // State storage
    this.state = {
      tournamentData: null,
      bracketData: null,
      players: [],
      currentRound: 1,
      pendingUpdates: {},
      loading: false,
      error: null
    };
      
    // Subscribers
    this.subscribers = {
      // Key-based subscribers
      tournamentData: new Map(),
      bracketData: new Map(),
      players: new Map(),
      currentRound: new Map(),
      pendingUpdates: new Map(),
      loading: new Map(),
      error: new Map(),
        
      // Multiple key subscribers
      multi: new Map()
    };
      
    // Counter for generating unique subscriber IDs
    this.subscriberId = 0;
  }
    
  /**
     * Get a specific state value
     * @param {string} key - State key
     * @returns {*} State value
     */
  getState(key) {
    if (key in this.state) {
      return this.state[key];
    }
    console.warn(`State key "${key}" does not exist`);
    return undefined;
  }
    
  /**
     * Get multiple state values
     * @param {Array<string>} keys - State keys
     * @returns {Object} State values mapped to keys
     */
  getStates(keys) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.getState(key);
    });
    return result;
  }
    
  /**
     * Get complete state object
     * @returns {Object} Complete state
     */
  getCompleteState() {
    return { ...this.state };
  }
    
  /**
     * Set state value and notify subscribers
     * @param {string} key - State key
     * @param {*} value - New state value
     * @param {boolean} batch - Whether this is part of a batch update
     */
  setState(key, value, batch = false) {
    if (!(key in this.state)) {
      console.warn(`State key "${key}" does not exist`);
      return;
    }
      
    // Skip if value hasn't changed (using shallow comparison)
    if (this.state[key] === value) {
      return;
    }
      
    // Update state
    this.state[key] = value;
      
    // If batching, mark as pending and don't notify yet
    if (batch) {
      this.state.pendingUpdates[key] = true;
      return;
    }
      
    // Notify subscribers
    this.notifySubscribers(key);
  }
    
  /**
     * Set multiple state values and notify subscribers
     * @param {Object} updates - Map of state keys to new values
     * @param {boolean} batch - Whether to batch the updates
     */
  setStates(updates, batch = false) {
    // Check if any keys are invalid
    const invalidKeys = Object.keys(updates).filter(key => !(key in this.state));
    if (invalidKeys.length > 0) {
      console.warn(`Invalid state keys: ${invalidKeys.join(', ')}`);
    }
      
    // Apply valid updates
    Object.entries(updates)
      .filter(([key]) => key in this.state)
      .forEach(([key, value]) => {
        this.setState(key, value, true);
      });
      
    // If not batching, commit immediately
    if (!batch) {
      this.commitUpdates();
    }
  }
    
  /**
     * Commit pending updates and notify subscribers
     */
  commitUpdates() {
    const pendingKeys = Object.keys(this.state.pendingUpdates);
    if (pendingKeys.length === 0) {
      return;
    }
      
    // Clear pending updates
    this.state.pendingUpdates = {};
      
    // Notify subscribers
    pendingKeys.forEach(key => {
      this.notifySubscribers(key);
    });
      
    // Notify multi-key subscribers
    this.notifyMultiSubscribers(pendingKeys);
  }
    
  /**
     * Start a batch update
     * @returns {Object} Batch context
     */
  batch() {
    return {
      update: (key, value) => {
        this.setState(key, value, true);
        return this;
      },
      updates: (updates) => {
        this.setStates(updates, true);
        return this;
      },
      commit: () => {
        this.commitUpdates();
      }
    };
  }
    
  /**
     * Subscribe to state changes
     * @param {string|Array<string>} keys - State key(s) to subscribe to
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for the callback
     * @returns {Function} Unsubscribe function
     */
  subscribe(keys, callback, context = null) {
    if (!callback || typeof callback !== 'function') {
      console.error('Invalid callback provided to subscribe');
      return () => {};
    }
      
    const id = this.getNextSubscriberId();
      
    // Handle multiple keys
    if (Array.isArray(keys)) {
      this.subscribers.multi.set(id, { keys, callback, context });
      return () => {
        this.subscribers.multi.delete(id);
      };
    }
      
    // Handle single key
    if (typeof keys === 'string') {
      if (!(keys in this.subscribers)) {
        console.warn(`Invalid state key for subscription: ${keys}`);
        return () => {};
      }
        
      this.subscribers[keys].set(id, { callback, context });
      return () => {
        this.subscribers[keys].delete(id);
      };
    }
      
    console.error('Invalid keys format for subscription');
    return () => {};
  }
    
  /**
     * Unsubscribe all subscriptions for a context
     * @param {Object} context - Context to unsubscribe
     */
  unsubscribeAll(context) {
    if (!context) return;
      
    // Unsubscribe from single key subscriptions
    Object.values(this.subscribers).forEach(subscriberMap => {
      if (subscriberMap instanceof Map) {
        // Create array of IDs to delete to avoid modifying during iteration
        const idsToDelete = [];
        subscriberMap.forEach((subscriber, id) => {
          if (subscriber.context === context) {
            idsToDelete.push(id);
          }
        });
          
        // Delete subscribers
        idsToDelete.forEach(id => {
          subscriberMap.delete(id);
        });
      }
    });
  }
    
  /**
     * Notify subscribers of state changes
     * @param {string} key - State key that changed
     */
  notifySubscribers(key) {
    if (!(key in this.subscribers)) {
      return;
    }
      
    const value = this.state[key];
      
    // Notify key-specific subscribers
    this.subscribers[key].forEach(({ callback, context }) => {
      try {
        if (context) {
          callback.call(context, value, key);
        } else {
          callback(value, key);
        }
      } catch (error) {
        console.error(`Error in subscriber callback for ${key}:`, error);
      }
    });
  }
    
  /**
     * Notify multi-key subscribers of state changes
     * @param {Array<string>} changedKeys - Keys that changed
     */
  notifyMultiSubscribers(changedKeys) {
    this.subscribers.multi.forEach(({ keys, callback, context }) => {
      // Check if any of the subscribed keys changed
      const relevantKeys = keys.filter(key => changedKeys.includes(key));
      if (relevantKeys.length === 0) {
        return;
      }
        
      // Prepare state values for relevant keys
      const values = {};
      keys.forEach(key => {
        values[key] = this.state[key];
      });
        
      // Invoke callback
      try {
        if (context) {
          callback.call(context, values, relevantKeys);
        } else {
          callback(values, relevantKeys);
        }
      } catch (error) {
        console.error('Error in multi-key subscriber callback:', error);
      }
    });
  }
    
  /**
     * Get next subscriber ID
     * @returns {number} Unique subscriber ID
     */
  getNextSubscriberId() {
    return ++this.subscriberId;
  }
    
  /**
     * Reset state to initial values
     */
  resetState() {
    this.state = {
      tournamentData: null,
      bracketData: null,
      players: [],
      currentRound: 1,
      pendingUpdates: {},
      loading: false,
      error: null
    };
      
    // Notify all subscribers
    Object.keys(this.subscribers)
      .filter(key => key !== 'multi')
      .forEach(key => {
        this.notifySubscribers(key);
      });
      
    // Notify multi-key subscribers
    this.notifyMultiSubscribers(Object.keys(this.state));
  }
}
  
// Create and export a singleton instance
const tournamentStateManager = new TournamentStateManager();
export default tournamentStateManager;