import type { ApiError } from "./types/brighty.js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const BASE_URL = "https://api.brighty.app";
const CONFIG_DIR = join(homedir(), ".brighty");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface BrightyConfig {
  apiKey?: string;
}

function loadConfig(): BrightyConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content) as BrightyConfig;
    }
  } catch {
    // Config file doesn't exist or is invalid
  }
  return {};
}

export function saveApiKey(apiKey: string): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const config = loadConfig();
  config.apiKey = apiKey;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getApiKey(): string | undefined {
  // Priority: 1. Environment variable, 2. Config file
  return process.env.BRIGHTY_API_KEY || loadConfig().apiKey;
}

export class BrightyClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("BRIGHTY_API_KEY is required");
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorBody = await response.json() as Record<string, unknown>;
        // Brighty API uses 'description' field for error messages
        errorMessage = (errorBody.description as string) || (errorBody.message as string) || errorMessage;
        if (errorBody.name) {
          errorMessage = `${errorBody.name}: ${errorMessage}`;
        }
      } catch {
        // Use status text if JSON parsing fails
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`Brighty API error: ${errorMessage}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("POST", path, body, headers);
  }

  async patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("PATCH", path, body, headers);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }
}

let clientInstance: BrightyClient | null = null;

export function getClient(): BrightyClient {
  if (!clientInstance) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error(
        "Brighty API key not configured.\n\n" +
        "To set up, use the 'brighty_setup' tool with your API key, or:\n" +
        "1. Run: claude mcp set-env brighty BRIGHTY_API_KEY <your-api-key>\n" +
        "2. Or create ~/.brighty/config.json with: {\"apiKey\": \"<your-api-key>\"}\n\n" +
        "Get your API key from the Brighty Business dashboard."
      );
    }
    clientInstance = new BrightyClient(apiKey);
  }
  return clientInstance;
}

export function resetClient(): void {
  clientInstance = null;
}
