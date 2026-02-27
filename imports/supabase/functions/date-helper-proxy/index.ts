import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Helper: returns "+HH:MM" or "-HH:MM" UTC offset string for a given IANA timezone
function getUTCOffset(timezone: string, date: Date): string {
  try {
    // Get local time parts in the target timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
    const h = get('hour') === '24' ? '00' : get('hour');

    // Reconstruct local time as a UTC-interpreted Date to compute offset
    const localDateStr = `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}:${get('second')}Z`;
    const localAsUTC = new Date(localDateStr);
    const offsetMs = localAsUTC.getTime() - date.getTime();
    const offsetMin = Math.round(offsetMs / 60000);

    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
    const mm = String(absMin % 60).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
  } catch {
    return '+00:00';
  }
}

// Helper: extract date parts in a specific timezone using Intl
function getPartsInTZ(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(hour),
    minute: parseInt(get('minute')),
    second: parseInt(get('second')),
    yearStr: get('year'),
    monthStr: get('month'),
    dayStr: get('day'),
    hourStr: hour,
    minuteStr: get('minute'),
    secondStr: get('second'),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    console.log('Date Helper action:', action);

    let result: Record<string, any> = {};

    switch (action) {
      case 'getCurrentDate': {
        const now = new Date();
        const tz = params.timezone || 'UTC';

        let formatted: string;
        switch (params.format) {
          case 'yyyy-MM-dd':
            formatted = now.toLocaleDateString('en-CA', { timeZone: tz });
            break;
          case 'unix':
            formatted = String(Math.floor(now.getTime() / 1000));
            break;
          default: {
            // ISO 8601 with correct timezone offset (not always UTC)
            const p = getPartsInTZ(now, tz);
            const offset = getUTCOffset(tz, now);
            formatted = `${p.yearStr}-${p.monthStr}-${p.dayStr}T${p.hourStr}:${p.minuteStr}:${p.secondStr}${offset}`;
            break;
          }
        }

        result = { currentDate: formatted, timestamp: now.getTime(), timezone: tz };
        break;
      }

      case 'formatDate': {
        const date = new Date(params.date);
        if (isNaN(date.getTime())) throw new Error('Invalid date provided');

        let formatted: string;
        const tz = params.timezone || 'UTC';

        switch (params.format) {
          case 'iso': {
            const p = getPartsInTZ(date, tz);
            const offset = getUTCOffset(tz, date);
            formatted = `${p.yearStr}-${p.monthStr}-${p.dayStr}T${p.hourStr}:${p.minuteStr}:${p.secondStr}${offset}`;
            break;
          }
          case 'yyyy-MM-dd':
            formatted = date.toLocaleDateString('en-CA', { timeZone: tz });
            break;
          case 'MM/dd/yyyy': {
            formatted = date.toLocaleDateString('en-US', { timeZone: tz, month: '2-digit', day: '2-digit', year: 'numeric' });
            break;
          }
          case 'dd/MM/yyyy': {
            formatted = date.toLocaleDateString('en-GB', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' });
            break;
          }
          case 'human':
            formatted = date.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            break;
          case 'unix':
            formatted = String(Math.floor(date.getTime() / 1000));
            break;
          case 'custom': {
            if (params.customFormat) {
              const p = getPartsInTZ(date, tz);
              formatted = params.customFormat
                .replace('yyyy', String(p.year))
                .replace('MM', String(p.month).padStart(2, '0'))
                .replace('dd', String(p.day).padStart(2, '0'))
                .replace('HH', String(p.hour).padStart(2, '0'))
                .replace('mm', String(p.minute).padStart(2, '0'))
                .replace('ss', String(p.second).padStart(2, '0'));
            } else {
              const p = getPartsInTZ(date, tz);
              const offset = getUTCOffset(tz, date);
              formatted = `${p.yearStr}-${p.monthStr}-${p.dayStr}T${p.hourStr}:${p.minuteStr}:${p.secondStr}${offset}`;
            }
            break;
          }
          default: {
            const p = getPartsInTZ(date, tz);
            const offset = getUTCOffset(tz, date);
            formatted = `${p.yearStr}-${p.monthStr}-${p.dayStr}T${p.hourStr}:${p.minuteStr}:${p.secondStr}${offset}`;
          }
        }

        result = { formatted, originalDate: params.date, timestamp: date.getTime() };
        break;
      }

      case 'extractDateParts': {
        const date = new Date(params.date);
        if (isNaN(date.getTime())) throw new Error('Invalid date provided');

        const tz = params.timezone || 'UTC';
        const p = getPartsInTZ(date, tz);
        const offset = getUTCOffset(tz, date);
        const isoInTZ = `${p.yearStr}-${p.monthStr}-${p.dayStr}T${p.hourStr}:${p.minuteStr}:${p.secondStr}${offset}`;

        // Day of week in the target timezone
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(date);
        const dayOfWeekNumber = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(dayOfWeek);

        // Day of year in target timezone
        const startOfYear = new Date(Date.UTC(p.year, 0, 1));
        // Use the localized date to compute day of year
        const localDate = new Date(`${p.yearStr}-${p.monthStr}-${p.dayStr}T00:00:00Z`);
        const dayOfYear = Math.floor((localDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const weekNumber = Math.ceil(dayOfYear / 7);

        result = {
          iso: isoInTZ,
          year: p.year,
          month: p.month,
          day: p.day,
          hour: p.hour,
          minute: p.minute,
          second: p.second,
          millisecond: date.getMilliseconds(),
          dayOfWeek,
          dayOfWeekNumber,
          dayOfYear,
          weekNumber,
          timestamp: date.getTime(),
          unixTimestamp: Math.floor(date.getTime() / 1000),
          timezone: tz,
          utcOffset: offset,
        };
        break;
      }

      case 'dateDifference': {
        const start = new Date(params.startDate);
        const end = new Date(params.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid date(s) provided');

        const diffMs = end.getTime() - start.getTime();

        let difference: number;
        switch (params.unit) {
          case 'seconds': difference = diffMs / 1000; break;
          case 'minutes': difference = diffMs / (1000 * 60); break;
          case 'hours': difference = diffMs / (1000 * 60 * 60); break;
          case 'days': difference = diffMs / (1000 * 60 * 60 * 24); break;
          case 'weeks': difference = diffMs / (1000 * 60 * 60 * 24 * 7); break;
          case 'months': difference = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()); break;
          case 'years': difference = end.getFullYear() - start.getFullYear() + (end.getMonth() - start.getMonth()) / 12; break;
          default: difference = diffMs / (1000 * 60 * 60 * 24);
        }

        result = { difference: Math.round(difference * 100) / 100, unit: params.unit, startDate: params.startDate, endDate: params.endDate };
        break;
      }

      case 'addSubtractDate': {
        const date = new Date(params.date);
        if (isNaN(date.getTime())) throw new Error('Invalid date provided');

        const amount = params.operation === 'subtract' ? -Number(params.amount) : Number(params.amount);

        switch (params.unit) {
          case 'seconds': date.setSeconds(date.getSeconds() + amount); break;
          case 'minutes': date.setMinutes(date.getMinutes() + amount); break;
          case 'hours': date.setHours(date.getHours() + amount); break;
          case 'days': date.setDate(date.getDate() + amount); break;
          case 'weeks': date.setDate(date.getDate() + amount * 7); break;
          case 'months': date.setMonth(date.getMonth() + amount); break;
          case 'years': date.setFullYear(date.getFullYear() + amount); break;
        }

        result = { resultDate: date.toISOString(), originalDate: params.date, operation: params.operation, amount: params.amount, unit: params.unit };
        break;
      }

      case 'nextDayofWeek': {
        const refDate = params.date ? new Date(params.date) : new Date();
        if (isNaN(refDate.getTime())) throw new Error('Invalid reference date');

        const targetDay = Number(params.dayOfWeek);
        const currentDay = refDate.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;

        const nextDate = new Date(refDate);
        nextDate.setDate(nextDate.getDate() + daysUntil);

        result = { nextDate: nextDate.toISOString(), dayOfWeek: nextDate.toLocaleDateString('en-US', { weekday: 'long' }), daysUntil };
        break;
      }

      case 'nextDayofYear': {
        const refDate = params.date ? new Date(params.date) : new Date();
        if (isNaN(refDate.getTime())) throw new Error('Invalid reference date');

        const targetMonth = Number(params.month) - 1;
        const targetDay = Number(params.day);

        let targetDate = new Date(refDate.getFullYear(), targetMonth, targetDay);
        if (targetDate <= refDate) {
          targetDate = new Date(refDate.getFullYear() + 1, targetMonth, targetDay);
        }

        result = { nextDate: targetDate.toISOString(), daysUntil: Math.ceil((targetDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)) };
        break;
      }

      case 'firstDayOfPreviousMonth': {
        const refDate = params.date ? new Date(params.date) : new Date();
        if (isNaN(refDate.getTime())) throw new Error('Invalid reference date');
        const tz = params.timezone || 'UTC';

        const p = getPartsInTZ(refDate, tz);
        // First day of previous month in the target timezone
        const prevMonth = p.month === 1 ? 12 : p.month - 1;
        const prevYear = p.month === 1 ? p.year - 1 : p.year;
        const firstDay = new Date(Date.UTC(prevYear, prevMonth - 1, 1));

        result = {
          date: firstDay.toISOString(),
          formatted: firstDay.toLocaleDateString('en-CA', { timeZone: tz }),
          timezone: tz,
        };
        break;
      }

      case 'lastDayOfPreviousMonth': {
        const refDate = params.date ? new Date(params.date) : new Date();
        if (isNaN(refDate.getTime())) throw new Error('Invalid reference date');
        const tz = params.timezone || 'UTC';

        const p = getPartsInTZ(refDate, tz);
        // Last day of previous month = day 0 of current month
        const lastDay = new Date(Date.UTC(p.year, p.month - 1, 0));

        result = {
          date: lastDay.toISOString(),
          formatted: lastDay.toLocaleDateString('en-CA', { timeZone: tz }),
          timezone: tz,
        };
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ ...result, status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Date Helper proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
