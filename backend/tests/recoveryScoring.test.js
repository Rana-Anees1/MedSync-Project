import { describe, it, expect } from 'vitest';
import { scoreCheckin, isWorsening } from '../src/domain/recoveryScoring.js';

const normal = { temp: 37.0, pain: 2, wound: 'normal', eating: 'normal', mobility: 'normal', drain: '', bleeding: false, breathless: false };

describe('Recovery check-in scoring', () => {
  it('UT-21 gives a score of 0 and no red flag for a normal check-in', () => {
    expect(scoreCheckin(normal)).toMatchObject({ score: 0, redFlag: false });
  });

  it('UT-22 applies the temperature boundaries 37.5 / 37.6 / 38.0', () => {
    expect(scoreCheckin({ ...normal, temp: 37.5 }).score).toBe(0);
    expect(scoreCheckin({ ...normal, temp: 37.6 }).score).toBe(1);
    expect(scoreCheckin({ ...normal, temp: 38.0 }).score).toBe(2);
  });

  it('UT-23 raises a red flag at 39.0 °C but not at 38.9 °C', () => {
    expect(scoreCheckin({ ...normal, temp: 38.9 }).redFlag).toBe(false);
    expect(scoreCheckin({ ...normal, temp: 39.0 }).redFlag).toBe(true);
  });

  it('UT-24 raises a red flag for an opened wound, bleeding or breathlessness', () => {
    expect(scoreCheckin({ ...normal, wound: 'opened' }).redFlag).toBe(true);
    expect(scoreCheckin({ ...normal, bleeding: true }).redFlag).toBe(true);
    expect(scoreCheckin({ ...normal, breathless: true }).redFlag).toBe(true);
  });

  it('UT-25 scores pain bands 3 / 4 / 6 / 8 as 0 / 1 / 2 / 3', () => {
    expect([3, 4, 6, 8].map((p) => scoreCheckin({ ...normal, pain: p }).score)).toEqual([0, 1, 2, 3]);
  });

  it('UT-26 detects a worsening trend only for three strictly rising scores ending at 2 or more', () => {
    expect(isWorsening([{ score: 1 }, { score: 3 }, { score: 7 }])).toBe(true);
    expect(isWorsening([{ score: 0 }, { score: 1 }, { score: 1 }])).toBe(false);
    expect(isWorsening([{ score: 2 }, { score: 3 }])).toBe(false);
  });
});
