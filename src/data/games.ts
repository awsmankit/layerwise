import { scenarios } from '../games/blueprint';
import { crunchScenarios } from '../games/costcrunch';
import { fitScenarios } from '../games/fitmodel';
import { incidents } from '../games/incidents';

export type GameMeta = {
  id: string;
  href: string;
  title: string;
  tagline: string;
  blurb: string;
  /** Prefix used for score keys, matching the game components. */
  prefix: string;
  levelIds: string[];
  minutes: string;
  practises: string;
  startHere: string;
};

export const games: GameMeta[] = [
  {
    id: 'blueprint',
    href: '/play/blueprint/',
    title: 'Blueprint',
    tagline: 'Design an AI feature to a brief',
    blurb: 'Make six design decisions and see whether the system meets the budget, speed, quality, safety and uptime the brief demands. Then see how many of the 1,296 possible designs actually work.',
    prefix: 'blueprint',
    levelIds: scenarios.map((s) => s.id),
    minutes: '10 to 20 min',
    practises: 'System design trade-offs',
    startHere: 'Anyone who has seen the Foundations track',
  },
  {
    id: 'cost-crunch',
    href: '/play/cost-crunch/',
    title: 'Cost Crunch',
    tagline: 'Cut the bill without breaking quality',
    blurb: 'A system costs too much. You have a few moves to fix it. Every lever saves money and carries a risk, and some of them interfere with each other.',
    prefix: 'crunch',
    levelIds: crunchScenarios.map((s) => s.id),
    minutes: '5 to 10 min',
    practises: 'Cost levers and evals',
    startHere: 'Works from the first lesson on tokens',
  },
  {
    id: 'fit-the-model',
    href: '/play/fit-the-model/',
    title: 'Fit the Model',
    tagline: 'Make it fit in memory',
    blurb: 'Pick a model size and the precision of its weights and cache so that it fits the hardware, serves enough users and is still good enough. The memory maths is real.',
    prefix: 'fit',
    levelIds: fitScenarios.map((s) => s.id),
    minutes: '5 to 10 min',
    practises: 'KV cache, quantization, serving capacity',
    startHere: 'Best after the serving lessons',
  },
  {
    id: 'incident-room',
    href: '/play/incident-room/',
    title: 'Incident Room',
    tagline: 'Find the root cause from the evidence',
    blurb: 'Something has gone wrong in production. Read logs, traces and dashboards, decide what is really happening, and choose the fix. Evidence costs points, so read with a plan.',
    prefix: 'incident',
    levelIds: incidents.map((i) => i.id),
    minutes: '3 to 8 min each',
    practises: 'Debugging RAG, agents, cost, reliability and evals',
    startHere: 'Good at every level; start with the one-star incidents',
  },
];
