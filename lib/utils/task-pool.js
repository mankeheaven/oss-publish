import {EventEmitter} from 'events';


class Pool extends EventEmitter {
  constructor(options) {
    super();
    options = options || {};
    this.timeout = options.timeout || 10000;
    this.style = options.style || 'callback';
    this.limit = options.limit || 10;
    this.running = 0;
    this.queue = [];
  }

  next() {
    this.running--;
    if (!this.start() && !this.running) {
      this.emit('idle');
    }
  }

  start() {
    if (this.running >= this.limit) return true;
    const task = this.queue.shift();
    if (!task) return false;
    this.running++;
    process.nextTick(task.run.bind(task));
    return true;
  }

  add(task) {
    task.pool = this;
    this.queue.push(task);
    this.start();
  }

  wrap(fn, options) {
    options = options || {};
    const timeout = options.timeout || this.timeout;
    const style = options.style || this.style;
    return function wrapped() {
      const task = new Task({
        fn,
        timeout,
        style,
        args: [].slice.call(arguments),
      });
      this.add(task);
      return task;
    }.bind(this);
  }

  get promise() {
    this.wrap = (fn, options) => {
      delete this.wrap;
      return this.wrap(fn, Object.assign({ style: 'promise' }, options));
    };
    return this;
  }
}

export default Pool

class Task extends EventEmitter {
  constructor(options) {
    super();
    this.timeout = options.timeout;
    this.args = options.args;
    this.fn = options.fn;
    this.style = options.style || 'callback';
    this.promise = new Promise(resolve => this.on('run', resolve));
    this.then = this.promise.then.bind(this.promise);
    this.catch = this.promise.catch.bind(this.promise);
    this.running = false;
    this.done = false;
    this.started = false;
    this.timedOut = false;
  }

  run() {
    let callback;
    if (this.style !== 'promise' && typeof this.args[this.args.length - 1] === 'function') {
      callback = this.args.pop();
    }
    const resolve = function resolve() {
      this.done = true;
      this.running = false;
      if (callback) {
        callback.apply(null, [].slice.call(arguments));
      }
      this.emit('end');
      if (!this.timedOut) {
        clearTimeout(this.timer);
        if (this.pool) {
          this.pool.next();
        }
      }
    }.bind(this);
    if (this.style !== 'promise') {
      this.args.push(resolve);
    }
    this.started = this.running = true;
    this.result = this.fn.apply(null, this.args);
    if (this.style === 'promise') {
      this.result.then(resolve, resolve);
    }
    this.emit('run', this.result);
    this.timer = setTimeout(() => {
      this.timedOut = true;
      this.emit('timeout');
      if (this.pool) {
        this.pool.emit('timeout', this);
        this.pool.next();
      }
    }, this.timeout);
  }
}