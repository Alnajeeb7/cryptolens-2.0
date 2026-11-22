import { Candle } from '@/types/market';

export interface CSVValidationResult {
  valid: boolean;
  candles: Candle[];
  errors: string[];
  warnings: string[];
  rowCount: number;
}

export class CSVMarketDataParser {
  public static parse(csvText: string): CSVValidationResult {
    const lines = csvText.trim().split(/\r?\n/);
    const errors: string[] = [];
    const warnings: string[] = [];
    const candles: Candle[] = [];

    if (lines.length < 2) {
      return {
        valid: false,
        candles: [],
        errors: ['CSV file is empty or missing data rows.'],
        warnings: [],
        rowCount: 0,
      };
    }

    // Header check
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/['"]/g, ''));

    const timeIdx = headers.findIndex((h) => h.includes('time') || h.includes('date'));
    const openIdx = headers.findIndex((h) => h === 'open');
    const highIdx = headers.findIndex((h) => h === 'high');
    const lowIdx = headers.findIndex((h) => h === 'low');
    const closeIdx = headers.findIndex((h) => h === 'close');
    const volIdx = headers.findIndex((h) => h.includes('vol'));

    if (timeIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
      return {
        valid: false,
        candles: [],
        errors: [
          `Invalid CSV columns. Required: Timestamp, Open, High, Low, Close. Found: ${headers.join(', ')}`,
        ],
        warnings: [],
        rowCount: 0,
      };
    }

    const seenTimestamps = new Set<number>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 5) {
        warnings.push(`Row ${i + 1}: Skipped incomplete row.`);
        continue;
      }

      // Parse timestamp (support ISO-8601 string or numeric millisecond/second epoch)
      let rawTime = parts[timeIdx];
      let timestamp = Number(rawTime);
      if (isNaN(timestamp) || timestamp < 1e9) {
        const parsedDate = new Date(rawTime).getTime();
        if (!isNaN(parsedDate)) {
          timestamp = parsedDate;
        } else {
          errors.push(`Row ${i + 1}: Unrecognized timestamp "${rawTime}".`);
          continue;
        }
      } else if (timestamp < 1e11) {
        // Seconds epoch to ms
        timestamp *= 1000;
      }

      const open = parseFloat(parts[openIdx]);
      const high = parseFloat(parts[highIdx]);
      const low = parseFloat(parts[lowIdx]);
      const close = parseFloat(parts[closeIdx]);
      const volume = volIdx !== -1 ? parseFloat(parts[volIdx]) || 0 : 1000;

      // Price validations
      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
        errors.push(`Row ${i + 1}: Non-numeric price encountered.`);
        continue;
      }
      if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        errors.push(`Row ${i + 1}: Non-positive prices are invalid.`);
        continue;
      }

      // OHLC consistency
      if (high < Math.max(open, close) || low > Math.min(open, close)) {
        errors.push(`Row ${i + 1}: OHLC logic violated (High must be >= Open & Close, Low <= Open & Close).`);
        continue;
      }

      // Duplicate check
      if (seenTimestamps.has(timestamp)) {
        warnings.push(`Row ${i + 1}: Duplicate timestamp ${timestamp} ignored.`);
        continue;
      }
      seenTimestamps.add(timestamp);

      candles.push({ timestamp, open, high, low, close, volume });
    }

    // Sort chronologically ascending
    candles.sort((a, b) => a.timestamp - b.timestamp);

    return {
      valid: errors.length === 0 && candles.length > 0,
      candles,
      errors: errors.slice(0, 10), // Limit error dump
      warnings: warnings.slice(0, 10),
      rowCount: candles.length,
    };
  }
}
