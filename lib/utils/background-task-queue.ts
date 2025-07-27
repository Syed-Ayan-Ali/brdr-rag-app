export class BackgroundTaskQueue {
  private static instance: BackgroundTaskQueue;
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): BackgroundTaskQueue {
    if (!BackgroundTaskQueue.instance) {
      BackgroundTaskQueue.instance = new BackgroundTaskQueue();
    }
    return BackgroundTaskQueue.instance;
  }

  enqueue(task: () => Promise<void>) {
    this.queue.push(task);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Background task processing error:', error);
        }
      }
    }
    this.isProcessing = false;
  }
}