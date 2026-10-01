export const trackingSteps = [
  { status: 'pending', label: 'Pendiente' },
  { status: 'processing', label: 'Procesando' },
  { status: 'shipped', label: 'Enviado' },
  { status: 'delivered', label: 'Entregado' },
];

const statusLabels: Record<string, string> = {
  cancelled: 'Cancelado',
  returnrequested: 'Devolución solicitada',
  replacementrequested: 'Cambio solicitado',
  returned: 'Devuelto',
  refundinitiated: 'Reembolso en proceso',
  refunded: 'Reembolsado',
};

export const getTrackingStepIndex = (status: string): number =>
  trackingSteps.findIndex((step) => step.status === status.toLowerCase());

export const getOrderStatusLabel = (status: string): string =>
  trackingSteps.find((step) => step.status === status.toLowerCase())?.label
  ?? statusLabels[status.toLowerCase()]
  ?? 'Estado por confirmar';

export const getPaymentStatusLabel = (isPaid: boolean | undefined, status: string): string => {
  if (status.toLowerCase() === 'refunded') return 'Reembolsado';
  if (status.toLowerCase() === 'refundinitiated') return 'Reembolso en proceso';
  return isPaid ? 'Pago confirmado' : 'Pago pendiente';
};
