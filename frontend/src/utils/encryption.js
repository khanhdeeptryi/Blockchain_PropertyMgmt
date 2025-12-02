/**
 * Client-side encryption utilities for sensitive data
 * Uses Web Crypto API (AES-GCM)
 */

/**
 * Generate a random AES-GCM encryption key
 * @returns {Promise<CryptoKey>}
 */
export async function generateEncryptionKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to base64 string for storage/sharing
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const exportedKeyBuffer = new Uint8Array(exported);
  const base64 = btoa(String.fromCharCode.apply(null, exportedKeyBuffer));
  return base64;
}

/**
 * Import key from base64 string
 * @param {string} base64Key
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(base64Key) {
  const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-GCM
 * @param {Object|string} data - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{ciphertext: string, iv: string}>}
 */
export async function encryptData(data, key) {
  const encoder = new TextEncoder();
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);
  
  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  );
  
  const cipherArray = new Uint8Array(cipherBuffer);
  const ciphertext = btoa(String.fromCharCode.apply(null, cipherArray));
  const ivBase64 = btoa(String.fromCharCode.apply(null, iv));
  
  return {
    ciphertext,
    iv: ivBase64
  };
}

/**
 * Decrypt data with AES-GCM
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} ivBase64 - Base64 encoded IV
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<Object|string>}
 */
export async function decryptData(ciphertext, ivBase64, key) {
  const cipherArray = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    cipherArray
  );
  
  const decoder = new TextDecoder();
  const decryptedString = decoder.decode(decryptedBuffer);
  
  try {
    return JSON.parse(decryptedString);
  } catch {
    return decryptedString;
  }
}

/**
 * Hash sensitive data with SHA-256
 * @param {Object|string} data
 * @returns {Promise<string>} Hex hash
 */
export async function hashData(data) {
  const encoder = new TextEncoder();
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);
  
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `0x${hashHex}`;
}

/**
 * Create encrypted metadata with sensitive fields encrypted
 * @param {Object} metadata - Full metadata
 * @param {Array<string>} sensitiveFields - Fields to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{metadata: Object, encryptedFields: Object, key: string}>}
 */
export async function createEncryptedMetadata(metadata, sensitiveFields = [], key = null) {
  if (!key) {
    key = await generateEncryptionKey();
  }
  
  const publicMetadata = { ...metadata };
  const encryptedData = {};
  
  // Extract and encrypt sensitive fields
  for (const field of sensitiveFields) {
    if (metadata[field]) {
      const encrypted = await encryptData(metadata[field], key);
      encryptedData[field] = encrypted;
      publicMetadata[field] = `[ENCRYPTED]`; // Placeholder
    }
  }
  
  // Add encryption info
  publicMetadata._encrypted = {
    fields: sensitiveFields,
    algorithm: 'AES-GCM-256',
    note: 'Decryption key required for sensitive fields'
  };
  
  const exportedKey = await exportKey(key);
  
  return {
    metadata: publicMetadata,
    encryptedFields: encryptedData,
    key: exportedKey
  };
}

/**
 * Decrypt metadata with encrypted fields
 * @param {Object} metadata - Metadata with _encrypted info
 * @param {Object} encryptedFields - Encrypted field data
 * @param {string} keyBase64 - Base64 encryption key
 * @returns {Promise<Object>}
 */
export async function decryptMetadata(metadata, encryptedFields, keyBase64) {
  const key = await importKey(keyBase64);
  const decryptedMetadata = { ...metadata };
  
  for (const [field, encrypted] of Object.entries(encryptedFields)) {
    try {
      const decrypted = await decryptData(encrypted.ciphertext, encrypted.iv, key);
      decryptedMetadata[field] = decrypted;
    } catch (error) {
      console.error(`Failed to decrypt field ${field}:`, error);
      decryptedMetadata[field] = '[DECRYPTION FAILED]';
    }
  }
  
  delete decryptedMetadata._encrypted;
  return decryptedMetadata;
}
