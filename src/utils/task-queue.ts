export class TaskQueue {
  running = false;
  p = Promise.resolve();

  queue<A>(f: () => A | Promise<A>): Promise<A> {
    return new Promise<A>((resolve, reject) => {
      this.p = this.p.then(async () => {
        this.running = true;
        try {
          resolve(await f())
        } catch (e) {
          reject(e)
        }
        this.running = false;
      })
    })
  }
}
