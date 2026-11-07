import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-autoscaling',
  title: 'What if the server count never changes?',
  blurb: 'Run a day of traffic against a fixed number of servers and see the money wasted at night or the requests turned away at the peak, then compare with autoscaling and its start-up delay.',
  area: 'serving',
  level: 'intermediate',
  minutes: 5,
  why: [
    'Traffic is not flat. Most services are quiet at night and busy in the afternoon, with sudden rushes after an email or a launch. With a fixed number of servers you have to pick one number for the whole day. Pick a small one and the peak overwhelms you, so requests are turned away or time out. Pick one big enough for the peak and you pay for servers that sit idle for most of the day. In the example on this page, 8 servers are needed to survive the peak, and they are about 45% used over the day.',
    'Autoscaling changes the number of servers as the load changes. The common rule, used by the Kubernetes Horizontal Pod Autoscaler, is: desired replicas = ceil(current replicas x current metric / target metric). In plain words, if each server is meant to run at 70% and the load needs more than that, add servers. The same autoscaler removes servers only after a waiting period, so that it does not shut servers down just before the next rise.',
    'Autoscaling is not magic. It reads the load a little late, and a new inference server must start, load its model, and warm up before it can help. Servers are billed while they start. During a sudden rush the old servers are overloaded until the new ones are ready, so some requests are still turned away. The slider shows that the longer the start-up, the more is lost. Real systems keep some spare headroom, scale on a leading signal such as queue length, and keep a small pool of warm servers.',
    'The traffic, server speed, price and delays here are examples chosen to show the shape. They are not measurements of any real service.',
  ],
  takeaways: [
    'A fixed server count must be wrong most of the day: too many at night, or too few at the peak.',
    'Autoscaling sets the count from the load. The Kubernetes rule is desired = ceil(current x current metric / target metric).',
    'New servers need time to start, and they are billed while they start, so a sudden rush can still drop requests.',
    'Scaling down slowly protects you from the next rise; scaling up early, or keeping some warm spare servers, protects you from the start-up delay.',
  ],
  lessons: ['infra/kubernetes-and-autoscaling-for-inference', 'infra/gpu-observability-and-capacity-planning', 'cost/cost-levers'],
  sources: [
    { label: 'Kubernetes documentation: Horizontal Pod Autoscaling', url: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/' },
  ],
  updated: '2026-11-07',
};
