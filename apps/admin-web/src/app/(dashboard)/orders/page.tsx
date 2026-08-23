import type { Metadata } from 'next';
import { OrdersClient } from './orders-client';

export const metadata: Metadata = { title: 'Order' };

export default function OrdersPage() {
  return <OrdersClient />;
}
