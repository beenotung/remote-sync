import {TaskQueue} from "./task-queue";

export class TaskPool {
  queues: TaskQueue[];

  constructor(public size) {
    this.queues = new Array(size);
    for (let i = 0; i < size; i++) {
      this.queues[i] = new TaskQueue();
    }
  }

  pickQueue() {
    let q = this.queues.find(q => !q.running);
    if (!q) {
      let i = Math.round(Math.random() * (this.queues.length - 1));
      q = this.queues[i];
    }
    return q;
  }

  queue<A>(f: () => A | Promise<A>): Promise<A> {
    return this.pickQueue().queue(f)
  }
}
