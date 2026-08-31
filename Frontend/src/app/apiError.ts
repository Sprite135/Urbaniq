type ApiErrorData = {
  message?: string;
};

type ApiError = {
  status?: number | string;
  data?: ApiErrorData | string;
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!isRecord(error)) return fallback;

  const apiError = error as ApiError;

  if (typeof apiError.data === 'string') {
    return apiError.data;
  }

  if (isRecord(apiError.data) && typeof apiError.data.message === 'string') {
    return apiError.data.message;
  }

  if (typeof apiError.message === 'string') {
    return apiError.message;
  }

  return fallback;
};

export const getApiErrorStatus = (error: unknown) =>
  isRecord(error) ? (error as ApiError).status : undefined;
