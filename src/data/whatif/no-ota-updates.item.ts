import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-ota-updates',
  title: 'What if devices can never be updated over the air?',
  blurb: 'Find a bug in a fleet of devices, then watch how fast a staged update reaches them compared with a recall, and what a rollback saves when the fix is bad too.',
  area: 'edge',
  level: 'basic',
  minutes: 4,
  why: [
    'A model or a program on a device is only as good as the version it runs. Over-the-air (OTA) updating means the maker can send a new version through the internet, usually while the device charges on Wi-Fi. Without it, a bug found after the device is sold stays on every device until its owner brings it back.',
    'The simulation on this page uses an invented fleet of 2,000 devices. A fix is ready 3 days after the bug is found. Devices connect at different rates: some almost daily, some now and then, some hardly ever. With updates, the fix reaches about 85 percent of the devices within a month in the default setting. With a recall, where each owner returns the device with a small chance each day, only about one in ten is fixed in the same month, and a third after three months. The numbers are examples, but the gap is not an accident: a push needs no action from the owner and a recall needs a lot.',
    'Updates bring their own risk, because the fix can be wrong too. So real fleets use staged rollouts. A small share of devices gets the update first, the team watches for problems, and only then does it widen. If the update is bad, the rollout stops and a rollback sends the old version back. Try the bad-fix button: with a first stage of 1 percent, fewer than 1 in 100 devices ever sees the bad update. Sent to everyone at once, it reaches more than half the fleet in three days. Android A/B updates also write the new version to a second slot, so a device that fails to boot it falls back to the old one by itself. Devices that never connect stay on whatever they have, good or bad.',
  ],
  takeaways: [
    'Without OTA updates, the only fix after sale is a recall, and most owners do not return the device.',
    'Updates reach most of a fleet in weeks, but devices that stay offline are never reached.',
    'A staged rollout trades a few days of speed for a much smaller blast radius if the update is bad.',
    'Keep a rollback path and halt rules ready before the first update ships.',
  ],
  lessons: ['edge/shipping-to-a-fleet', 'systems/testing-and-deploying-ml-models'],
  sources: [
    { label: 'Google SRE Workbook, chapter 16: Canarying Releases', url: 'https://sre.google/workbook/canarying-releases/' },
    { label: 'A/B (seamless) system updates (Android Open Source Project)', url: 'https://source.android.com/docs/core/ota/ab' },
  ],
  updated: '2026-11-06',
};
