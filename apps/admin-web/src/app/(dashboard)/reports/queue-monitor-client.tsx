'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MetricCard } from '@/components/common/metric-card';
import { formatNumber } from '@/lib/utils';
import { queueService } from '@/services/commerce.service';

interface QueueStat {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface FailedJob {
  id: string;
  name: string;
  failedReason?: string;
  attemptsMade: number;
}

export function QueueMonitorClient() {
  const qc = useQueryClient();
  const [selectedQueue, setSelectedQueue] = useState('sync-order');
  const { data } = useQuery({ queryKey: ['queues'], queryFn: queueService.getStats, refetchInterval: 10000 });
  const { data: failedData } = useQuery({
    queryKey: ['queues', selectedQueue, 'failed'],
    queryFn: () => queueService.getFailed(selectedQueue),
    refetchInterval: 15000,
  });

  const retryMutation = useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) => queueService.retry(queue, jobId),
    onSuccess: () => {
      toast.success('Job dikirim ulang');
      qc.invalidateQueries({ queryKey: ['queues'] });
    },
  });

  const queues: QueueStat[] = data?.data || [];
  const failedJobs: FailedJob[] = failedData?.data || [];
  const totals = queues.reduce(
    (sum, item) => ({
      waiting: sum.waiting + item.waiting,
      active: sum.active + item.active,
      completed: sum.completed + item.completed,
      failed: sum.failed + item.failed,
    }),
    { waiting: 0, active: 0, completed: 0, failed: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Queue Monitor</h1>
          <p className="text-sm text-muted-foreground">Pantau sync product, order, stock, webhook, dan retry job gagal.</p>
        </div>
        <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['queues'] })}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Waiting" value={formatNumber(totals.waiting)} icon={Clock} tone="orange" />
        <MetricCard title="Active" value={formatNumber(totals.active)} icon={Activity} tone="blue" />
        <MetricCard title="Completed" value={formatNumber(totals.completed)} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Failed" value={formatNumber(totals.failed)} icon={AlertTriangle} tone="red" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue</TableHead>
              <TableHead className="text-right">Waiting</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queues.map((queue) => (
              <TableRow key={queue.name} className="cursor-pointer" onClick={() => setSelectedQueue(queue.name)}>
                <TableCell className="font-medium">{queue.name}</TableCell>
                <TableCell className="text-right">{formatNumber(queue.waiting)}</TableCell>
                <TableCell className="text-right">{formatNumber(queue.active)}</TableCell>
                <TableCell className="text-right">{formatNumber(queue.completed)}</TableCell>
                <TableCell className="text-right"><Badge variant={queue.failed ? 'destructive' : 'secondary'}>{formatNumber(queue.failed)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="font-medium">Failed Jobs: {selectedQueue}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Attempts</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failedJobs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">Tidak ada failed job.</TableCell></TableRow>
            ) : failedJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <p className="font-medium">{job.name}</p>
                  <p className="text-xs text-muted-foreground">{job.id}</p>
                </TableCell>
                <TableCell className="max-w-xl truncate">{job.failedReason || '-'}</TableCell>
                <TableCell className="text-right">{job.attemptsMade}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => retryMutation.mutate({ queue: selectedQueue, jobId: job.id })}>Retry</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
