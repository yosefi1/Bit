import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: unknown;
  constructor(
    code: ApiErrorCode,
    message: string,
    status?: number,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.status =
      status ??
      ({
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        BAD_REQUEST: 400,
        CONFLICT: 409,
        INTERNAL: 500,
      }[code] as number);
    this.details = details;
  }
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status }
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Validation failed",
          details: err.flatten(),
        },
      },
      { status: 400 }
    );
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL",
        message: "Internal server error",
      },
    },
    { status: 500 }
  );
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}
