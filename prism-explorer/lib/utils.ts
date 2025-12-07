import { formatDistanceToNow } from 'date-fns';

// Format address: 0x1234...5678
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
}

// Format hash
export function truncateHash(hash: string, start = 10, end = 8): string {
  return truncateAddress(hash, start, end);
}

// Format time ago
export function timeAgo(timestamp: number): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}

// Format PRISM amount (18 decimals)
export function formatPRISM(amount: bigint | string | number, decimals = 18, maxDecimals = 4): string {
  if (!amount) return '0 PRISM';

  const value = typeof amount === 'string' ? BigInt(amount) : typeof amount === 'number' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === BigInt(0)) {
    return `${whole.toLocaleString()} PRISM`;
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.substring(0, maxDecimals).replace(/0+$/, '');

  if (trimmed === '') {
    return `${whole.toLocaleString()} PRISM`;
  }

  return `${whole.toLocaleString()}.${trimmed} PRISM`;
}

// Format PRISM amount without PRISM suffix
export function formatPRISMValue(amount: bigint | string | number, decimals = 18, maxDecimals = 4): string {
  const formatted = formatPRISM(amount, decimals, maxDecimals);
  return formatted.replace(' PRISM', '');
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Format bytes
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format date
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// Format ISO date
export function formatISODate(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Validate address format
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate hash format
export function isValidHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// Get transaction status label
export function getTransactionStatusLabel(status: string): {
  label: string;
  color: string;
} {
  const statuses: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'text-yellow-600' },
    confirmed: { label: 'Confirmed', color: 'text-green-600' },
    failed: { label: 'Failed', color: 'text-red-600' },
  };

  return statuses[status] || { label: 'Unknown', color: 'text-gray-600' };
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

// Get color for transaction type
export function getTransactionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    transfer: 'text-blue-600',
    contract: 'text-purple-600',
    mint: 'text-green-600',
    burn: 'text-red-600',
  };

  return colors[type] || 'text-gray-600';
}

// Format block time
export function formatBlockTime(timestamp: number, previousTimestamp?: number): string {
  if (!previousTimestamp) return '-';

  const timeDiff = timestamp - previousTimestamp;
  const seconds = Math.floor(timeDiff / 1000);

  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
