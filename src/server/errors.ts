import "server-only";

export class ServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const notFound = (what: string) => new ServiceError(404, "not_found", `${what} not found`);
export const forbidden = (msg: string) => new ServiceError(403, "forbidden", msg);
export const conflict = (msg: string) => new ServiceError(409, "conflict", msg);
export const badRequest = (msg: string) => new ServiceError(400, "bad_request", msg);
