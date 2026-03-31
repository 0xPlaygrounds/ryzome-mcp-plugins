import {
  createApiClient,
  type CreateCanvasRequest,
  type CreateCanvasResponse,
  type PatchCanvasRequest,
  type GetUploadUrlResponse,
} from "./client";

export interface RyzomeClientConfig {
  apiKey: string;
  apiUrl: string;
  appUrl: string;
}

export type RyzomeRequestStage =
  | "createCanvas"
  | "getCanvas"
  | "patchCanvas"
  | "patchSharingConfig"
  | "getUploadUrl"
  | "uploadFile";

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function stringifyErrorBody(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value == null) return "";

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildErrorMessage(params: {
  stage: RyzomeRequestStage;
  method: string;
  path: string;
  status: number;
  body: string;
  canvasId?: string;
}) {
  const context = [
    `${params.stage} failed`,
    `${params.method} ${params.path}`,
    `status=${params.status}`,
    params.canvasId ? `canvasId=${params.canvasId}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return params.body ? `${context} | body=${params.body}` : context;
}

export class RyzomeApiError extends Error {
  readonly stage: RyzomeRequestStage;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly body: string;
  readonly retryable: boolean;
  readonly canvasId?: string;

  constructor(params: {
    stage: RyzomeRequestStage;
    method: string;
    path: string;
    status: number;
    body: string;
    retryable: boolean;
    canvasId?: string;
    cause?: unknown;
  }) {
    super(buildErrorMessage(params), { cause: params.cause });
    this.name = "RyzomeApiError";
    this.stage = params.stage;
    this.method = params.method;
    this.path = params.path;
    this.status = params.status;
    this.body = params.body;
    this.retryable = params.retryable;
    this.canvasId = params.canvasId;
  }
}

type CanvasApiClient = ReturnType<typeof createApiClient>;

function makeApiKeyMiddleware(apiKey: string) {
  return {
    async onRequest({ request }: { request: Request }) {
      const headers = new Headers(request.headers);
      headers.set("x-api-key", apiKey);
      headers.set("Content-Type", "application/json");
      headers.set("User-Agent", `RyzomeOpenclawPlugin/0.1.0`);

      return new Request(request, { headers });
    },
  };
}

function makeResponseCaptureMiddleware(
  responseBodies: WeakMap<Response, string>,
) {
  return {
    async onResponse({ response }: { response: Response }) {
      const body = await response
        .clone()
        .text()
        .catch(() => "");
      responseBodies.set(response, body);
      return response;
    },
  };
}

export class RyzomeClient {
  private readonly client: CanvasApiClient;
  private readonly responseBodies = new WeakMap<Response, string>();

  constructor(config: RyzomeClientConfig) {
    this.client = createApiClient(`${config.apiUrl.replace(/\/+$/, "")}/v1`);
    this.client.use(makeApiKeyMiddleware(config.apiKey));
    this.client.use(makeResponseCaptureMiddleware(this.responseBodies));
  }

  private buildHttpError(params: {
    stage: RyzomeRequestStage;
    method: string;
    path: string;
    response: Response;
    error: unknown;
    canvasId?: string;
  }) {
    const body =
      this.responseBodies.get(params.response) ||
      stringifyErrorBody(params.error) ||
      params.response.statusText;

    return new RyzomeApiError({
      stage: params.stage,
      method: params.method,
      path: params.path,
      status: params.response.status,
      body,
      retryable: isRetryableStatus(params.response.status),
      canvasId: params.canvasId,
    });
  }

  private buildNetworkError(params: {
    stage: RyzomeRequestStage;
    method: string;
    path: string;
    error: unknown;
    canvasId?: string;
  }) {
    return new RyzomeApiError({
      stage: params.stage,
      method: params.method,
      path: params.path,
      status: 0,
      body: stringifyErrorBody(params.error),
      retryable: true,
      canvasId: params.canvasId,
      cause: params.error,
    });
  }

  async createCanvas(req: CreateCanvasRequest): Promise<CreateCanvasResponse> {
    try {
      const { data, error, response } = await this.client.POST("/canvas", {
        body: req,
      });

      if (!response.ok || !data) {
        throw this.buildHttpError({
          stage: "createCanvas",
          method: "POST",
          path: "/canvas",
          response,
          error,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof RyzomeApiError) throw error;
      throw this.buildNetworkError({
        stage: "createCanvas",
        method: "POST",
        path: "/canvas",
        error,
      });
    }
  }

  async getCanvas(canvasId: string) {
    const path = `/canvas/${canvasId}`;

    try {
      const { data, error, response } = await this.client.GET(
        "/canvas/{canvas_id}",
        {
          params: { path: { canvas_id: canvasId } },
        },
      );

      if (!response.ok || !data) {
        throw this.buildHttpError({
          stage: "getCanvas",
          method: "GET",
          path,
          response,
          error,
          canvasId,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof RyzomeApiError) throw error;
      throw this.buildNetworkError({
        stage: "getCanvas",
        method: "GET",
        path,
        error,
        canvasId,
      });
    }
  }

  async patchCanvas(canvasId: string, req: PatchCanvasRequest): Promise<void> {
    const path = `/canvas/${canvasId}`;

    try {
      const { error, response } = await this.client.PATCH(
        "/canvas/{canvas_id}",
        {
          params: { path: { canvas_id: canvasId } },
          body: req,
        },
      );

      if (!response.ok) {
        throw this.buildHttpError({
          stage: "patchCanvas",
          method: "PATCH",
          path,
          response,
          error,
          canvasId,
        });
      }
    } catch (error) {
      if (error instanceof RyzomeApiError) throw error;
      throw this.buildNetworkError({
        stage: "patchCanvas",
        method: "PATCH",
        path,
        error,
        canvasId,
      });
    }
  }

  /**
   * Request a presigned S3 upload URL.
   * NOTE: This route currently requires cookie auth on the backend.
   * API key auth support is being added — calls may fail with 401/403 until then.
   */
  async requestUploadUrl(s3Key: string): Promise<GetUploadUrlResponse> {
    try {
      const { data, error, response } = await this.client.POST("/files", {
        body: { s3_key: s3Key },
      });

      if (!response.ok || !data) {
        throw this.buildHttpError({
          stage: "getUploadUrl",
          method: "POST",
          path: "/files",
          response,
          error,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof RyzomeApiError) throw error;
      throw this.buildNetworkError({
        stage: "getUploadUrl",
        method: "POST",
        path: "/files",
        error,
      });
    }
  }

  /**
   * Upload a file to S3 using the presigned POST URL and fields.
   */
  async uploadFile(
    presignedUrl: string,
    fields: Record<string, string>,
    fileBuffer: Uint8Array,
    contentType: string,
  ): Promise<void> {
    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
      formData.append("Content-Type", contentType);
      formData.append("file", new Blob([fileBuffer as BlobPart], { type: contentType }));

      const response = await fetch(presignedUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new RyzomeApiError({
          stage: "uploadFile",
          method: "POST",
          path: presignedUrl,
          status: response.status,
          body: await response.text().catch(() => ""),
          retryable: isRetryableStatus(response.status),
        });
      }
    } catch (error) {
      if (error instanceof RyzomeApiError) throw error;
      throw this.buildNetworkError({
        stage: "uploadFile",
        method: "POST",
        path: presignedUrl,
        error,
      });
    }
  }
}
