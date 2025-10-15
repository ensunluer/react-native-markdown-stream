export class StreamBuffer {
  private readonly chunks: string[] = [];

  constructor(initialValue = '') {
    if (initialValue) {
      this.chunks.push(initialValue);
    }
  }

  append(chunk: string) {
    if (!chunk) {
      return;
    }
    this.chunks.push(chunk);
  }

  get value(): string {
    return this.chunks.join('');
  }

  reset() {
    this.chunks.length = 0;
  }
}
