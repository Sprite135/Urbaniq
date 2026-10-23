import { RefreshCw } from 'lucide-react';

type AdminLoadErrorProps = {
  message: string;
  onRetry: () => void;
};

const AdminLoadError = ({ message, onRetry }: AdminLoadErrorProps) => (
  <div role="alert" className="flex flex-col gap-3 border border-red-200 bg-red-50 p-5 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
    <p>{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-red-300 bg-white px-4 text-xs font-bold uppercase tracking-wide hover:bg-red-100"
    >
      <RefreshCw className="h-4 w-4" />
      Reintentar
    </button>
  </div>
);

export default AdminLoadError;
