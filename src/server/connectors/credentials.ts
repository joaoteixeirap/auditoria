import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const value = process.env.CONNECTOR_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error("Configure CONNECTOR_ENCRYPTION_KEY com 32 bytes em hexadecimal.");
  return Buffer.from(value, "hex");
}

export function encryptCredential(token: string, scope: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(scope));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

export function decryptCredential(value: string, scope: string): string {
  const [version, iv, tag, ciphertext, ...extra] = value.split(":");
  if (
    version !== "v1" ||
    !iv ||
    !/^[a-f0-9]{24}$/i.test(iv) ||
    !tag ||
    !/^[a-f0-9]{32}$/i.test(tag) ||
    ciphertext === undefined ||
    !/^(?:[a-f0-9]{2})*$/i.test(ciphertext) ||
    extra.length
  )
    throw new Error("Credencial inválida.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  decipher.setAAD(Buffer.from(scope));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
