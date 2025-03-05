// public/scripts/services/timer-service.js

/**
 * Timer Service
 * Manages game timer functionality across tournament components
 */
class TimerService {
  constructor() {
    // Timer state
    this.time = 20 * 60; // 20 minutes in seconds
    this.running = false;
    this.interval = null;
      
    // DOM elements
    this.timerDisplay = null;
    this.startTimerBtn = null;
      
    // Callbacks
    this.onTimeUp = null;
      
    // Bind methods to maintain 'this' context
    this.start = this.start.bind(this);
    this.reset = this.reset.bind(this);
    this.updateDisplay = this.updateDisplay.bind(this);
    this.timeUp = this.timeUp.bind(this);
  }
    
  /**
     * Initialize the timer service
     * @param {Object} options - Timer options
     * @param {HTMLElement} options.timerDisplay - Timer display element
     * @param {HTMLElement} options.startTimerBtn - Start/reset timer button
     * @param {Function} options.onTimeUp - Callback for when timer reaches zero
     */
  initialize(options = {}) {
    this.timerDisplay = options.timerDisplay;
    this.startTimerBtn = options.startTimerBtn;
    this.onTimeUp = options.onTimeUp;
      
    // Initialize display
    this.updateDisplay();
      
    // Return this for method chaining
    return this;
  }
    
  /**
     * Start the timer
     */
  start() {
    if (this.running) return;
      
    this.running = true;
      
    if (this.startTimerBtn) {
      this.startTimerBtn.textContent = 'Reset Timer';
    }
      
    this.interval = setInterval(() => {
      this.time--;
      this.updateDisplay();
        
      if (this.time <= 0) {
        this.timeUp();
      }
    }, 1000);
  }
    
  /**
     * Reset the timer
     */
  reset() {
    this.time = 20 * 60;
    this.running = false;
      
    clearInterval(this.interval);
    this.interval = null;
      
    if (this.startTimerBtn) {
      this.startTimerBtn.textContent = 'Start Timer';
    }
      
    this.updateDisplay();
      
    if (this.timerDisplay) {
      this.timerDisplay.classList.remove('time-up');
    }
  }
    
  /**
     * Update the timer display
     */
  updateDisplay() {
    if (!this.timerDisplay) return;
      
    const minutes = Math.floor(this.time / 60);
    const seconds = this.time % 60;
      
    this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
    
  /**
     * Handle timer reaching zero
     */
  timeUp() {
    clearInterval(this.interval);
    this.running = false;
      
    if (this.startTimerBtn) {
      this.startTimerBtn.textContent = 'Start Timer';
    }
      
    if (this.timerDisplay) {
      this.timerDisplay.classList.add('time-up');
    }
      
    // Call the onTimeUp callback if provided
    if (typeof this.onTimeUp === 'function') {
      this.onTimeUp();
    }
  }
    
  /**
     * Check if timer is running
     * @returns {boolean} Timer running status
     */
  isRunning() {
    return this.running;
  }
    
  /**
     * Get remaining time in seconds
     * @returns {number} Remaining time in seconds
     */
  getRemainingTime() {
    return this.time;
  }
    
  /**
     * Clean up resources
     */
  cleanup() {
    clearInterval(this.interval);
    this.interval = null;
    this.running = false;
  }
}
  
// Create and export a singleton instance
const timerService = new TimerService();
export default timerService;