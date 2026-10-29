// Each face is replaced at the edge, not kept underneath a hidden front.
export class CardFlipController {
  constructor() { this.jobs = new Map(); }
  isBusy(id) { return this.jobs.has(id); }
  async flip({ id, allowed, reduced = false, exit, swap, enter, finish = () => {} }) {
    if (this.isBusy(id) || !allowed()) return false;
    const job = new AbortController();
    this.jobs.set(id, job);
    try {
      if (!reduced) await exit(job.signal);
      if (job.signal.aborted || !allowed()) return false;
      swap();
      if (!reduced) await enter(job.signal);
      return !job.signal.aborted;
    } catch (error) {
      if (!job.signal.aborted) throw error;
      return false;
    } finally {
      if (this.jobs.get(id) === job) this.jobs.delete(id);
      finish();
    }
  }
  cancelAll() {
    for (const job of this.jobs.values()) job.abort();
    this.jobs.clear();
  }
}
