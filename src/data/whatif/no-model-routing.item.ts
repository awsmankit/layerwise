import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-model-routing',
  title: 'What if every request goes to the biggest model?',
  blurb: 'Send a mix of easy and hard requests to one big model, then add a router that sends easy ones to a small model, and see the bill fall and the risk of a wrong guess.',
  area: 'serving',
  level: 'basic',
  minutes: 4,
  why: [
    'Not every question needs the biggest model. "What are your opening hours?" and "Summarise this contract clause" are very different jobs. A big model can do both, but it charges for the hard job every time. In the example prices on this page the big model costs 10 times as much per request as the small one.',
    'A router is a small, cheap step in front of the models. It reads the request and decides which model should answer. If 70 in 100 requests are easy and the router sends them to the small model, the day\'s bill in this example falls from $125 to about $47. The router itself costs very little, because it only reads a short piece of the request.',
    'The saving has a risk. A router is itself a guess, and it can be wrong in two ways. If it sends an easy request to the big model, you only waste money. If it sends a hard request to the small model, the person gets a worse answer, and nobody sees it unless you check. The slider shows how the cost and the bad answers move as the router gets worse. In the example, the small model fails on 60% of the hard requests it is handed.',
    'Real systems measure this. They test the router on labelled examples, send low-confidence requests to the big model, and let a small model hand a request up if it cannot answer. The research on routing and cascades reports large savings at a similar quality, but the right setting depends on your own traffic, so test on your own requests. All prices and rates on this page are examples, not offers from any provider.',
  ],
  takeaways: [
    'A router sends easy requests to a cheap model and keeps the big model for hard ones. Cost falls with the share of easy traffic.',
    'The router can be wrong. A hard request sent to a small model is a bad answer; an easy request sent to a big model is wasted money.',
    'Wrong guesses cost money and quality at the same time, so measure the router on your own labelled examples before trusting the saving.',
    'With no router at all, you pay the biggest model\'s price for every request, including the easy ones.',
  ],
  lessons: ['systems/model-routing-and-fallbacks', 'cost/cost-levers'],
  sources: [
    { label: 'FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance (Chen, Zaharia, Zou, 2023)', url: 'https://arxiv.org/abs/2305.05176' },
    { label: 'RouteLLM: Learning to Route LLMs with Preference Data (Ong et al., 2024)', url: 'https://arxiv.org/abs/2406.18665' },
  ],
  updated: '2026-11-07',
};
