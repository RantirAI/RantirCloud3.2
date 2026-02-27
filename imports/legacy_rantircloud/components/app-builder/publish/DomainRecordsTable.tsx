import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose?: string;
}

interface DomainRecordsTableProps {
  records: DnsRecord[];
  className?: string;
}

export function DomainRecordsTable({ records, className }: DomainRecordsTableProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (value: string, index: number) => {
    navigator.clipboard.writeText(value);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
            <th className="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr 
              key={`${record.type}-${record.name}-${index}`}
              className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-2.5">
                <span className={cn(
                  'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold',
                  record.type === 'A' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                  record.type === 'CNAME' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
                  record.type === 'TXT' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                )}>
                  {record.type}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-foreground">
                {record.name}
              </td>
              <td className="px-3 py-2.5 font-mono text-foreground max-w-[150px]">
                <span className="block truncate" title={record.value}>
                  {record.value}
                </span>
              </td>
              <td className="px-2 py-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(record.value, index)}
                >
                  {copiedIndex === index ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
