import { isAxiosError } from "axios";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pickErrorMessage = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  const message = value.message;
  if (typeof message === "string" && message.trim()) return message;
  return null;
};

const unwrapPayload = (source: unknown): unknown => {
  if (!isRecord(source)) return source;

  if (source.success === false) {
    throw new Error(pickErrorMessage(source) || "Request failed");
  }

  if ("data" in source) return source.data;
  return source;
};

export const extractApiArray = <T,>(source: unknown, keys: string[] = []): T[] => {
  const payload = unwrapPayload(source);

  if (Array.isArray(payload)) return payload as T[];

  if (isRecord(payload)) {
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) return value as T[];
    }
  }

  if (isRecord(source)) {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) return value as T[];
    }
  }

  throw new Error("Unexpected response format");
};

export const extractApiObject = <T extends UnknownRecord>(source: unknown): T => {
  const payload = unwrapPayload(source);
  if (isRecord(payload)) return payload as T;
  throw new Error("Unexpected response format");
};

export const getErrorMessage = (error: unknown, fallback = "Request failed"): string => {
  if (isAxiosError(error)) {
    const responseMessage = pickErrorMessage(error.response?.data);
    if (responseMessage) return responseMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isRecord(error)) {
    const nestedMessage = pickErrorMessage(error);
    if (nestedMessage) return nestedMessage;
  }

  return fallback;
};
