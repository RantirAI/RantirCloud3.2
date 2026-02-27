import { NodePlugin } from '@/types/node-plugin';

// Comprehensive IANA timezone options covering all UTC offsets (UTC-12 to UTC+14)
const TIMEZONE_OPTIONS = [
  // Common / Frequently Used
  { label: 'UTC (UTC+00:00)', value: 'UTC' },
  { label: 'America/New_York (EST/EDT, UTC-5/-4)', value: 'America/New_York' },
  { label: 'America/Chicago (CST/CDT, UTC-6/-5)', value: 'America/Chicago' },
  { label: 'America/Denver (MST/MDT, UTC-7/-6)', value: 'America/Denver' },
  { label: 'America/Los_Angeles (PST/PDT, UTC-8/-7)', value: 'America/Los_Angeles' },
  { label: 'America/Toronto (EST/EDT, UTC-5/-4)', value: 'America/Toronto' },
  { label: 'America/Vancouver (PST/PDT, UTC-8/-7)', value: 'America/Vancouver' },
  { label: 'America/Sao_Paulo (BRT, UTC-3)', value: 'America/Sao_Paulo' },
  { label: 'Europe/London (GMT/BST, UTC+0/+1)', value: 'Europe/London' },
  { label: 'Europe/Paris (CET/CEST, UTC+1/+2)', value: 'Europe/Paris' },
  { label: 'Europe/Berlin (CET/CEST, UTC+1/+2)', value: 'Europe/Berlin' },
  { label: 'Europe/Moscow (MSK, UTC+3)', value: 'Europe/Moscow' },
  { label: 'Asia/Dubai (GST, UTC+4)', value: 'Asia/Dubai' },
  { label: 'Asia/Kolkata (IST, UTC+5:30)', value: 'Asia/Kolkata' },
  { label: 'Asia/Dhaka (BST, UTC+6)', value: 'Asia/Dhaka' },
  { label: 'Asia/Bangkok (ICT, UTC+7)', value: 'Asia/Bangkok' },
  { label: 'Asia/Singapore (SGT, UTC+8)', value: 'Asia/Singapore' },
  { label: 'Asia/Shanghai (CST, UTC+8)', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo (JST, UTC+9)', value: 'Asia/Tokyo' },
  { label: 'Australia/Sydney (AEST/AEDT, UTC+10/+11)', value: 'Australia/Sydney' },
  { label: 'Pacific/Auckland (NZST/NZDT, UTC+12/+13)', value: 'Pacific/Auckland' },
  { label: 'Pacific/Apia (WSST/WSDT / LINT, UTC+13/+14)', value: 'Pacific/Apia' },
  // Americas
  { label: 'America/Anchorage (AKST/AKDT, UTC-9/-8)', value: 'America/Anchorage' },
  { label: 'America/Honolulu (HST, UTC-10)', value: 'America/Honolulu' },
  { label: 'Pacific/Pago_Pago (SST, UTC-11)', value: 'Pacific/Pago_Pago' },
  { label: 'Pacific/Niue (NUT, UTC-11)', value: 'Pacific/Niue' },
  { label: 'Etc/GMT+12 (UTC-12)', value: 'Etc/GMT+12' },
  { label: 'America/Halifax (AST/ADT, UTC-4/-3)', value: 'America/Halifax' },
  { label: 'America/St_Johns (NST/NDT, UTC-3:30/-2:30)', value: 'America/St_Johns' },
  { label: 'America/Argentina/Buenos_Aires (ART, UTC-3)', value: 'America/Argentina/Buenos_Aires' },
  { label: 'America/Montevideo (UYT, UTC-3)', value: 'America/Montevideo' },
  { label: 'America/Santiago (CLT/CLST, UTC-4/-3)', value: 'America/Santiago' },
  { label: 'America/Bogota (COT, UTC-5)', value: 'America/Bogota' },
  { label: 'America/Lima (PET, UTC-5)', value: 'America/Lima' },
  { label: 'America/Mexico_City (CST/CDT, UTC-6/-5)', value: 'America/Mexico_City' },
  { label: 'America/Tegucigalpa (CST, UTC-6)', value: 'America/Tegucigalpa' },
  { label: 'America/Costa_Rica (CST, UTC-6)', value: 'America/Costa_Rica' },
  { label: 'America/Caracas (VET, UTC-4)', value: 'America/Caracas' },
  { label: 'America/La_Paz (BOT, UTC-4)', value: 'America/La_Paz' },
  { label: 'America/Manaus (AMT, UTC-4)', value: 'America/Manaus' },
  { label: 'America/Guyana (GYT, UTC-4)', value: 'America/Guyana' },
  { label: 'America/Paramaribo (SRT, UTC-3)', value: 'America/Paramaribo' },
  { label: 'America/Cayenne (GFT, UTC-3)', value: 'America/Cayenne' },
  { label: 'America/Nuuk (WGT/WGST, UTC-3/-2)', value: 'America/Nuuk' },
  { label: 'America/Noronha (FNT, UTC-2)', value: 'America/Noronha' },
  { label: 'Atlantic/Azores (AZOT/AZOST, UTC-1/0)', value: 'Atlantic/Azores' },
  { label: 'Atlantic/Cape_Verde (CVT, UTC-1)', value: 'Atlantic/Cape_Verde' },
  // Europe
  { label: 'Europe/Lisbon (WET/WEST, UTC+0/+1)', value: 'Europe/Lisbon' },
  { label: 'Europe/Dublin (GMT/IST, UTC+0/+1)', value: 'Europe/Dublin' },
  { label: 'Europe/Amsterdam (CET/CEST, UTC+1/+2)', value: 'Europe/Amsterdam' },
  { label: 'Europe/Brussels (CET/CEST, UTC+1/+2)', value: 'Europe/Brussels' },
  { label: 'Europe/Madrid (CET/CEST, UTC+1/+2)', value: 'Europe/Madrid' },
  { label: 'Europe/Rome (CET/CEST, UTC+1/+2)', value: 'Europe/Rome' },
  { label: 'Europe/Vienna (CET/CEST, UTC+1/+2)', value: 'Europe/Vienna' },
  { label: 'Europe/Warsaw (CET/CEST, UTC+1/+2)', value: 'Europe/Warsaw' },
  { label: 'Europe/Stockholm (CET/CEST, UTC+1/+2)', value: 'Europe/Stockholm' },
  { label: 'Europe/Athens (EET/EEST, UTC+2/+3)', value: 'Europe/Athens' },
  { label: 'Europe/Bucharest (EET/EEST, UTC+2/+3)', value: 'Europe/Bucharest' },
  { label: 'Europe/Helsinki (EET/EEST, UTC+2/+3)', value: 'Europe/Helsinki' },
  { label: 'Europe/Kiev (EET/EEST, UTC+2/+3)', value: 'Europe/Kiev' },
  { label: 'Europe/Istanbul (TRT, UTC+3)', value: 'Europe/Istanbul' },
  { label: 'Europe/Minsk (FET, UTC+3)', value: 'Europe/Minsk' },
  // Africa
  { label: 'Africa/Abidjan (GMT, UTC+0)', value: 'Africa/Abidjan' },
  { label: 'Africa/Lagos (WAT, UTC+1)', value: 'Africa/Lagos' },
  { label: 'Africa/Johannesburg (SAST, UTC+2)', value: 'Africa/Johannesburg' },
  { label: 'Africa/Cairo (EET, UTC+2)', value: 'Africa/Cairo' },
  { label: 'Africa/Nairobi (EAT, UTC+3)', value: 'Africa/Nairobi' },
  { label: 'Africa/Addis_Ababa (EAT, UTC+3)', value: 'Africa/Addis_Ababa' },
  { label: 'Indian/Mauritius (MUT, UTC+4)', value: 'Indian/Mauritius' },
  { label: 'Indian/Maldives (MVT, UTC+5)', value: 'Indian/Maldives' },
  // Asia
  { label: 'Asia/Riyadh (AST, UTC+3)', value: 'Asia/Riyadh' },
  { label: 'Asia/Baghdad (AST, UTC+3)', value: 'Asia/Baghdad' },
  { label: 'Asia/Tehran (IRST/IRDT, UTC+3:30/+4:30)', value: 'Asia/Tehran' },
  { label: 'Asia/Baku (AZT/AZST, UTC+4/+5)', value: 'Asia/Baku' },
  { label: 'Asia/Tbilisi (GET, UTC+4)', value: 'Asia/Tbilisi' },
  { label: 'Asia/Yerevan (AMT/AMST, UTC+4/+5)', value: 'Asia/Yerevan' },
  { label: 'Asia/Kabul (AFT, UTC+4:30)', value: 'Asia/Kabul' },
  { label: 'Asia/Tashkent (UZT, UTC+5)', value: 'Asia/Tashkent' },
  { label: 'Asia/Karachi (PKT, UTC+5)', value: 'Asia/Karachi' },
  { label: 'Asia/Colombo (IST, UTC+5:30)', value: 'Asia/Colombo' },
  { label: 'Asia/Kathmandu (NPT, UTC+5:45)', value: 'Asia/Kathmandu' },
  { label: 'Asia/Almaty (ALMT, UTC+6)', value: 'Asia/Almaty' },
  { label: 'Asia/Rangoon (MMT, UTC+6:30)', value: 'Asia/Rangoon' },
  { label: 'Asia/Jakarta (WIB, UTC+7)', value: 'Asia/Jakarta' },
  { label: 'Asia/Ho_Chi_Minh (ICT, UTC+7)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'Asia/Manila (PST, UTC+8)', value: 'Asia/Manila' },
  { label: 'Asia/Taipei (CST, UTC+8)', value: 'Asia/Taipei' },
  { label: 'Asia/Hong_Kong (HKT, UTC+8)', value: 'Asia/Hong_Kong' },
  { label: 'Asia/Kuala_Lumpur (MYT, UTC+8)', value: 'Asia/Kuala_Lumpur' },
  { label: 'Asia/Ulaanbaatar (ULAT, UTC+8)', value: 'Asia/Ulaanbaatar' },
  { label: 'Asia/Seoul (KST, UTC+9)', value: 'Asia/Seoul' },
  { label: 'Asia/Pyongyang (KST, UTC+9)', value: 'Asia/Pyongyang' },
  { label: 'Asia/Yakutsk (YAKT, UTC+9)', value: 'Asia/Yakutsk' },
  // Australia & Pacific
  { label: 'Australia/Darwin (ACST, UTC+9:30)', value: 'Australia/Darwin' },
  { label: 'Australia/Adelaide (ACST/ACDT, UTC+9:30/+10:30)', value: 'Australia/Adelaide' },
  { label: 'Australia/Brisbane (AEST, UTC+10)', value: 'Australia/Brisbane' },
  { label: 'Australia/Melbourne (AEST/AEDT, UTC+10/+11)', value: 'Australia/Melbourne' },
  { label: 'Australia/Perth (AWST, UTC+8)', value: 'Australia/Perth' },
  { label: 'Australia/Lord_Howe (LHST/LHDT, UTC+10:30/+11)', value: 'Australia/Lord_Howe' },
  { label: 'Pacific/Port_Moresby (PGT, UTC+10)', value: 'Pacific/Port_Moresby' },
  { label: 'Pacific/Guadalcanal (SBT, UTC+11)', value: 'Pacific/Guadalcanal' },
  { label: 'Pacific/Norfolk (NFT, UTC+11)', value: 'Pacific/Norfolk' },
  { label: 'Pacific/Fiji (FJT/FJST, UTC+12/+13)', value: 'Pacific/Fiji' },
  { label: 'Pacific/Tongatapu (TOT, UTC+13)', value: 'Pacific/Tongatapu' },
  { label: 'Pacific/Chatham (CHAST/CHADT, UTC+12:45/+13:45)', value: 'Pacific/Chatham' },
  { label: 'Pacific/Kiritimati (LINT, UTC+14)', value: 'Pacific/Kiritimati' },
];

export const dateHelperNode: NodePlugin = {
  type: 'date-helper',
  name: 'Date Helper',
  description: 'Manipulate, format, and calculate dates and times',
  category: 'transformer',
  icon: 'https://cdn.activepieces.com/pieces/new-core/date-helper.svg',
  color: '#4A90D9',
  inputs: [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Current Date', value: 'getCurrentDate', description: 'Get the current date and time' },
        { label: 'Format Date', value: 'formatDate', description: 'Convert a date to a specific format' },
        { label: 'Extract Date Parts', value: 'extractDateParts', description: 'Extract year, month, day, etc. from a date' },
        { label: 'Date Difference', value: 'dateDifference', description: 'Calculate difference between two dates' },
        { label: 'Add/Subtract Date', value: 'addSubtractDate', description: 'Add or subtract time from a date' },
        { label: 'Next Day of Week', value: 'nextDayofWeek', description: 'Get the next occurrence of a specific day of the week' },
        { label: 'Next Day of Year', value: 'nextDayofYear', description: 'Get the next occurrence of a specific day of the year' },
        { label: 'First Day of Previous Month', value: 'firstDayOfPreviousMonth', description: 'Get the first day of the previous month' },
        { label: 'Last Day of Previous Month', value: 'lastDayOfPreviousMonth', description: 'Get the last day of the previous month' },
      ],
      description: 'Select the date operation to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'getCurrentDate') {
      inputs.push(
        {
          name: 'timezone',
          label: 'Timezone',
          type: 'select',
          required: false,
          default: 'UTC',
          options: TIMEZONE_OPTIONS,
          description: 'Timezone for the current date and time',
        },
        {
          name: 'format',
          label: 'Format',
          type: 'select',
          required: false,
          options: [
            { label: 'ISO 8601 (with timezone offset)', value: 'iso' },
            { label: 'YYYY-MM-DD (date only)', value: 'yyyy-MM-dd' },
            { label: 'Unix Timestamp', value: 'unix' },
          ],
        },
      );
    } else if (action === 'formatDate') {
      inputs.push(
        { name: 'date', label: 'Date', type: 'text', required: true, placeholder: '2025-01-15T10:30:00Z', description: 'Date to format (ISO 8601 or common formats)' },
        {
          name: 'format',
          label: 'Output Format',
          type: 'select',
          required: true,
          options: [
            { label: 'ISO 8601 (with timezone offset)', value: 'iso' },
            { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
            { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
            { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
            { label: 'Human Readable', value: 'human' },
            { label: 'Unix Timestamp', value: 'unix' },
            { label: 'Custom', value: 'custom' },
          ],
        },
        { name: 'customFormat', label: 'Custom Format', type: 'text', required: false, placeholder: 'yyyy-MM-dd HH:mm:ss', description: 'Custom format string (when Custom is selected)' },
        {
          name: 'timezone',
          label: 'Timezone',
          type: 'select',
          required: false,
          default: 'UTC',
          options: TIMEZONE_OPTIONS,
          description: 'Target timezone for output',
        },
      );
    } else if (action === 'extractDateParts') {
      inputs.push(
        { name: 'date', label: 'Date', type: 'text', required: true, placeholder: '2025-01-15T10:30:00Z', description: 'Date to extract parts from' },
        {
          name: 'timezone',
          label: 'Timezone',
          type: 'select',
          required: false,
          default: 'UTC',
          options: TIMEZONE_OPTIONS,
          description: 'Timezone context for extracted parts (year, month, day, hour, etc.)',
        },
      );
    } else if (action === 'dateDifference') {
      inputs.push(
        { name: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: '2025-01-01' },
        { name: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: '2025-12-31' },
        {
          name: 'unit',
          label: 'Unit',
          type: 'select',
          required: true,
          options: [
            { label: 'Days', value: 'days' },
            { label: 'Hours', value: 'hours' },
            { label: 'Minutes', value: 'minutes' },
            { label: 'Seconds', value: 'seconds' },
            { label: 'Weeks', value: 'weeks' },
            { label: 'Months', value: 'months' },
            { label: 'Years', value: 'years' },
          ],
        },
      );
    } else if (action === 'addSubtractDate') {
      inputs.push(
        { name: 'date', label: 'Date', type: 'text', required: true, placeholder: '2025-01-15T10:30:00Z' },
        {
          name: 'operation',
          label: 'Operation',
          type: 'select',
          required: true,
          options: [
            { label: 'Add', value: 'add' },
            { label: 'Subtract', value: 'subtract' },
          ],
        },
        { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '7' },
        {
          name: 'unit',
          label: 'Unit',
          type: 'select',
          required: true,
          options: [
            { label: 'Days', value: 'days' },
            { label: 'Hours', value: 'hours' },
            { label: 'Minutes', value: 'minutes' },
            { label: 'Seconds', value: 'seconds' },
            { label: 'Weeks', value: 'weeks' },
            { label: 'Months', value: 'months' },
            { label: 'Years', value: 'years' },
          ],
        },
      );
    } else if (action === 'nextDayofWeek') {
      inputs.push(
        { name: 'date', label: 'Reference Date', type: 'text', required: false, placeholder: '2025-01-15', description: 'Reference date (defaults to today)' },
        {
          name: 'dayOfWeek',
          label: 'Day of Week',
          type: 'select',
          required: true,
          options: [
            { label: 'Monday', value: '1' },
            { label: 'Tuesday', value: '2' },
            { label: 'Wednesday', value: '3' },
            { label: 'Thursday', value: '4' },
            { label: 'Friday', value: '5' },
            { label: 'Saturday', value: '6' },
            { label: 'Sunday', value: '0' },
          ],
        },
      );
    } else if (action === 'nextDayofYear') {
      inputs.push(
        { name: 'date', label: 'Reference Date', type: 'text', required: false, placeholder: '2025-01-15', description: 'Reference date (defaults to today)' },
        { name: 'month', label: 'Month', type: 'number', required: true, placeholder: '12', description: 'Target month (1-12)' },
        { name: 'day', label: 'Day', type: 'number', required: true, placeholder: '25', description: 'Target day of month' },
      );
    } else if (action === 'firstDayOfPreviousMonth') {
      inputs.push(
        { name: 'date', label: 'Reference Date', type: 'text', required: false, placeholder: '2025-03-15', description: 'Reference date (defaults to today)' },
        {
          name: 'timezone',
          label: 'Timezone',
          type: 'select',
          required: false,
          default: 'UTC',
          options: TIMEZONE_OPTIONS,
        },
      );
    } else if (action === 'lastDayOfPreviousMonth') {
      inputs.push(
        { name: 'date', label: 'Reference Date', type: 'text', required: false, placeholder: '2025-03-15', description: 'Reference date (defaults to today)' },
        {
          name: 'timezone',
          label: 'Timezone',
          type: 'select',
          required: false,
          default: 'UTC',
          options: TIMEZONE_OPTIONS,
        },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Processed date result' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('date-helper-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        status: data?.status || 'ok',
      };
    } catch (error) {
      throw new Error(`Date Helper error: ${error.message}`);
    }
  },
};
