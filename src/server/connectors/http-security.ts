import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function httpEndpoint(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    value.length > 2000 ||
    isIP(url.hostname) ||
    !url.hostname.includes(".") ||
    url.hostname.endsWith(".")
  )
    throw new Error("Destino HTTPS inválido.");
  return url;
}

// Primeira versão: apenas IPv4 público. IPv6 é recusado conservadoramente.
export function publicIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

export async function resolveHttpEndpoint(value: string, signal: AbortSignal) {
  const url = httpEndpoint(value);
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, family: 4 }),
    new Promise<never>((_, reject) => {
      if (signal.aborted) reject(new Error("Timeout."));
      else signal.addEventListener("abort", () => reject(new Error("Timeout.")), { once: true });
    }),
  ]);
  signal.throwIfAborted();
  if (!addresses.length || addresses.some((item) => !publicIPv4(item.address)))
    throw new Error("Destino não público.");
  return { url, address: addresses[0]!.address };
}
