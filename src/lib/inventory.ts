import { InventoryItem, RecurringEquipmentLoan } from './types';
import rawInventory from './inventory_data.json';

export const STATIC_INVENTORY: InventoryItem[] = rawInventory as InventoryItem[];

export const RECURRING_EQUIPMENT_LOANS: RecurringEquipmentLoan[] = [
  {
    id: 'rec-loan-1',
    groupName: 'tKaraoke',
    schedule: 'Fridays 8:00 PM – 12:00 AM',
    equipmentList: ['2x Monitors', '2x Mics', '2x XLR Cables', '2x 1/4" Cables'],
    notes: 'One of the IG heads has access to the Abbey via CSC and collects directly.',
  },
  {
    id: 'rec-loan-2',
    groupName: 'tGrapevine Podcast',
    schedule: 'TBC (Handover in progress)',
    equipmentList: ['Podcasting / Vocal Mic Setup'],
    notes: 'Schedule and equipment needed TBC; liaising during handover.',
  },
];

export interface BasePackage {
  id: 'Set A' | 'Set B' | 'Set C' | 'None';
  name: string;
  tagline: string;
  image?: string;
  specs: string[];
  bestFor: string[];
  items: string[];
}

export const BASE_PACKAGES: BasePackage[] = [
  {
    id: 'Set A',
    name: 'SET A',
    tagline: 'Yamaha Powered Mixer + 2 Speakers',
    image: '/images/packages/set_a.png',
    specs: ['Up to 6 inputs (4 XLRs)', 'Up to 4 Mics and BGM'],
    bestFor: [
      'Small events that only requires BGM and Mics',
      'Small performances that requires a few mics and instruments',
    ],
    items: [
      'Yamaha Powered Mixer (Stagepas)',
      '2x Passive PA Speakers',
      'Up to 4x Vocal Mics',
      'XLR Cables + Speaker Cables',
    ],
  },
  {
    id: 'Set B',
    name: 'SET B',
    tagline: 'Armoon 7-Channel Mixer + 2 Mackie Speakers',
    image: '/images/packages/set_b.png',
    specs: ['Up to 7 inputs (6 XLRs)', 'Able to support a band on top of emcees'],
    bestFor: [
      'Performances that requires more instruments / mics',
      'Able to support a band on top of emcees',
    ],
    items: [
      'Armoon Professional 7-Channel Mixer',
      '2x Mackie Thump 12A Active Speakers',
      'XLR Cables + Power Extension',
      'Boom Mic Stands',
    ],
  },
  {
    id: 'Set C',
    name: 'SET C',
    tagline: 'Direct Speaker Setup (1 Mackie + 2 Mics)',
    image: '/images/packages/set_c.png',
    specs: ['Up to 2 inputs (2 XLRs / 1/4" Jack)', 'No external mixer needed'],
    bestFor: [
      'Events that requires only Mics and Speakers',
      'Quick announcements, small gatherings, floor talks',
    ],
    items: [
      '1x Mackie Thump 12A Active Speaker',
      '2x Shure SM58 Vocal Mics (Direct-to-speaker)',
      '2x XLR Cables + UK 3-Pin Power Cable',
    ],
  },
  {
    id: 'None',
    name: 'Custom Gear Only (None)',
    tagline: 'Select specific microphones, cables, or instruments below',
    specs: ['Individual gear selection'],
    bestFor: ['When you only need specific items or cables'],
    items: [],
  },
];

// In-memory cache for live Google Sheet data
let cachedInventory: InventoryItem[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function fetchLiveInventory(): Promise<InventoryItem[]> {
  const now = Date.now();
  if (cachedInventory && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedInventory;
  }

  const sheetUrl =
    'https://docs.google.com/spreadsheets/d/17GLJ4iWoiAW79ZCypd-ixsyBrRTbCQDv9xm2MGVCubI/gviz/tq?tqx=out:json&gid=598695792';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(sheetUrl, {
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Google Sheet responded with ${res.status}`);

    const text = await res.text();
    const start = text.indexOf('(') + 1;
    const end = text.lastIndexOf(')');
    if (start <= 0 || end <= start) throw new Error('Invalid Gviz format');

    const json = JSON.parse(text.slice(start, end));
    const rows = json.table?.rows || [];

    const liveItems: InventoryItem[] = [];

    for (const r of rows) {
      const c = r.c || [];
      const barcode = c[1]?.v ? String(c[1].v).trim() : '';
      const name = c[2]?.v ? String(c[2].v).trim() : '';
      const cat = c[3]?.v ? String(c[3].v).trim() : 'Other';
      const subcat = c[4]?.v ? String(c[4].v).trim() : '';
      const workingVal = c[7]?.v ?? 0;

      let workingQty = 0;
      if (typeof workingVal === 'number') {
        workingQty = Math.max(0, Math.floor(workingVal));
      } else if (typeof workingVal === 'string') {
        const match = workingVal.match(/\d+/);
        if (match) workingQty = parseInt(match[0], 10);
      }

      if (name) {
        liveItems.push({
          id: barcode || `ITEM-${liveItems.length + 1}`,
          barcode,
          name,
          category: cat,
          subtype: subcat,
          workingQty,
          isAvailable: workingQty > 0,
        });
      }
    }

    if (liveItems.length > 0) {
      cachedInventory = liveItems;
      lastCacheTime = now;
      return liveItems;
    }
  } catch (err) {
    console.warn('Falling back to static inventory database:', err);
  }

  return STATIC_INVENTORY;
}
