import type { Metadata } from 'next';
import { QueueMonitorClient } from './queue-monitor-client';

export const metadata: Metadata = { title: 'Queue Monitor' };

export default function ReportsPage() {
  return <QueueMonitorClient />;
}
