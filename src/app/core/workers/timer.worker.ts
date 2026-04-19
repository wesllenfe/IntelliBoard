/// <reference lib="webworker" />

type WorkerMsg =
  | { type: 'START'; seconds: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' };

let intervalId: ReturnType<typeof setInterval> | null = null;
let remaining = 0;

addEventListener('message', ({ data }: MessageEvent<WorkerMsg>) => {
  switch (data.type) {
    case 'START':
      remaining = data.seconds;
      clearInterval(intervalId!);
      intervalId = setInterval(tick, 1000);
      break;
    case 'PAUSE':
      clearInterval(intervalId!);
      intervalId = null;
      break;
    case 'RESUME':
      if (intervalId === null && remaining > 0) {
        intervalId = setInterval(tick, 1000);
      }
      break;
    case 'STOP':
      clearInterval(intervalId!);
      intervalId = null;
      remaining = 0;
      break;
  }
});

function tick(): void {
  remaining--;
  if (remaining <= 0) {
    remaining = 0;
    clearInterval(intervalId!);
    intervalId = null;
    postMessage({ type: 'DONE' });
  } else {
    postMessage({ type: 'TICK', remaining });
  }
}
