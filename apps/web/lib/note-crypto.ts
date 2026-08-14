type EncryptedContent = {
  content: string;
  contentEncryptionSalt: string;
  contentEncryptionIv: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const iterations = 600_000;

function toBase64(value: Uint8Array) {
  let binary = '';
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function keyFromPassword(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptNoteContent(content: string, password: string, existingSalt?: string): Promise<EncryptedContent> {
  const salt = existingSalt ? fromBase64(existingSalt) : crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromPassword(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(content));

  return {
    content: toBase64(new Uint8Array(encrypted)),
    contentEncryptionSalt: toBase64(salt),
    contentEncryptionIv: toBase64(iv),
  };
}

export async function decryptNoteContent(content: string, password: string, salt: string, iv: string) {
  const key = await keyFromPassword(password, fromBase64(salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(content),
  );
  return decoder.decode(decrypted);
}
