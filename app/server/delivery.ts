// Delivery rules (pure, no I/O). India has no DST, so IST is a fixed UTC+05:30 offset.
export const SLOT_WINDOWS = [
  { startHour: 7, endHour: 10 },
  { startHour: 12, endHour: 15 },
  { startHour: 17, endHour: 20 }
] as const;
export const SLOT_DAYS = 3;
export const SLOT_CUTOFF_MINUTES = 120;
export const DEFAULT_SERVICE_PINCODES = Array.from({ length: 50 }, (_, i) => String(641001 + i));
export const DEFAULT_SERVICE_AREA = 'Coimbatore';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const IST_OFFSET = 330 * MINUTE;

export type DeliverySlot = { id: string; start: Date; end: Date; dayLabel: string; timeLabel: string };

const dayFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

export const formatSlotDay = (start: Date) => dayFormat.format(start);
export const formatSlotTime = (start: Date, end: Date) => `${timeFormat.format(start)} – ${timeFormat.format(end)}`;
export const formatSlot = (start: Date, end: Date) => `${formatSlotDay(start)} · ${formatSlotTime(start, end)}`;

export function istMidnightUtc(now: Date) {
  const ist = new Date(now.getTime() + IST_OFFSET);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET;
}

// Slots from the next SLOT_DAYS days that still have a bookable window, each starting at least the cutoff from now.
export function availableSlots(now = new Date()): DeliverySlot[] {
  const midnight = istMidnightUtc(now);
  const slots: DeliverySlot[] = [];
  const days = new Set<number>();
  for (let day = 0; days.size < SLOT_DAYS && day <= SLOT_DAYS; day++) {
    for (const window of SLOT_WINDOWS) {
      const start = new Date(midnight + day * DAY + window.startHour * HOUR);
      if (start.getTime() - now.getTime() < SLOT_CUTOFF_MINUTES * MINUTE) continue;
      const end = new Date(midnight + day * DAY + window.endHour * HOUR);
      slots.push({ id: start.toISOString(), start, end, dayLabel: formatSlotDay(start), timeLabel: formatSlotTime(start, end) });
      days.add(day);
    }
  }
  return slots;
}

export const findSlot = (id: unknown, now = new Date()) => typeof id === 'string' ? availableSlots(now).find(slot => slot.id === id) ?? null : null;

export const isPincode = (value: unknown): value is string => typeof value === 'string' && /^[1-9]\d{5}$/.test(value);
