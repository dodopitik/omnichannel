import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in our format, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          message: 'Success',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
