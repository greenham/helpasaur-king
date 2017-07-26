const util = require('util'),
  emitter = require('events').EventEmitter;

function Timers()
{
    let self = this;

    emitter.call(self);

    self.once = (forTimestamp, eventName) => {
      // figure out ms between now and scheduled time
      // setTimeout for event to be fired at that time
      let diff = forTimestamp - Date.now();
      if (diff < 0) return;
      setTimeout(() => {self.emit(eventName)}, diff);
      return self;
    };

    self.repeat = (intervalSeconds, eventName) => {
      setInterval(() => {self.emit(eventName)}, intervalSeconds*1000);
      return self;
    };

    self.onceAndRepeat = (forTimestamp, intervalSeconds, eventName) => {
      let diff = forTimestamp - Date.now();
      if (diff < 0) return;
      setTimeout(() => {
        self.emit(eventName);
        self.repeat(intervalSeconds, eventName);
      }, diff);
      return self;
    };
}

util.inherits(Timers, emitter);

module.exports = new Timers();
