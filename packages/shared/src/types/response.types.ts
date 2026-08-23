export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ApiError[];
  timestamp: string;
  path?: string;
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

export function createSuccessResponse<T>(
  data: T,
  message = 'Success',
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  message: string,
  errors?: ApiError[],
  path?: string,
): ApiResponse {
  return {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
    path,
  };
}
