class ValidationQueue {
  constructor(worker) {
    this.worker = worker;
    this.jobs = [];
    this.running = false;
  }

  async enqueue(job) {
    this.jobs.push(job);
    if (!this.running) {
      this.running = true;
      while (this.jobs.length) {
        const nextJob = this.jobs.shift();
        await this.worker(nextJob);
      }
      this.running = false;
    }
  }
}

module.exports = {
  ValidationQueue
};