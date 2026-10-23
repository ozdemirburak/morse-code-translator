import type { Mock } from 'vitest';

type MockParam = { value: number; setValueAtTime: Mock; linearRampToValueAtTime: Mock };
export type RenderNodes = {
  oscillator: { type: string; frequency: { value: number } };
  gainNode: { gain: MockParam };
};

type MockRender = { createOscillator: () => RenderNodes['oscillator']; createGain: () => RenderNodes['gainNode'] };

// Nodes of the first render chunk created by `create` (audio() renders chunk 0 at once).
export const firstRender = (create: () => unknown): RenderNodes => {
  const renders = (globalThis as unknown as { __offlineRenders: MockRender[] }).__offlineRenders;
  const before = renders.length;
  create();
  const render = renders[before];
  return { oscillator: render.createOscillator(), gainNode: render.createGain() };
};

// Tone levels the first render ramps to (attack targets), e.g. [1, 0, 1, 0].
export const rampTargets = (create: () => unknown): number[] =>
  firstRender(create).gainNode.gain.linearRampToValueAtTime.mock.calls.map((call) => call[0] as number);
