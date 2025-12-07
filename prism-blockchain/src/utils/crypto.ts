/**
 * Cryptographic utilities for Prism Blockchain
 *
 * Uses @noble/ed25519 for signatures and @noble/hashes for hashing
 */

import * as ed25519 from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * Key pair interface
 */
export interface KeyPair {
  publicKey: string;   // Hex-encoded public key
  privateKey: string;  // Hex-encoded private key
}

/**
 * Generate a new Ed25519 key pair
 * @returns KeyPair with hex-encoded public and private keys
 *
 * @example
 * const keys = await generateKeyPair();
 * console.log(keys.publicKey);  // "abc123..."
 * console.log(keys.privateKey); // "def456..."
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);

  return {
    publicKey: bytesToHex(publicKey),
    privateKey: bytesToHex(privateKey)
  };
}

/**
 * Convert a public key to an address
 * Address is the SHA256 hash of the public key with "0x" prefix
 *
 * @param publicKey Hex-encoded public key
 * @returns Address with "0x" prefix
 *
 * @example
 * const address = publicKeyToAddress(keys.publicKey);
 * console.log(address); // "0x789abc..."
 */
export function publicKeyToAddress(publicKey: string): string {
  // Remove "0x" prefix if present
  const cleanKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

  // Hash the public key
  const publicKeyBytes = hexToBytes(cleanKey);
  const addressHash = sha256(publicKeyBytes);

  // Return with "0x" prefix
  return '0x' + bytesToHex(addressHash);
}

/**
 * Generate a random address
 * @returns Random address with "0x" prefix
 *
 * @example
 * const address = generateAddress();
 * console.log(address); // "0x123abc..."
 */
export function generateAddress(): string {
  const randomBytes = ed25519.utils.randomPrivateKey();
  const addressHash = sha256(randomBytes);
  return '0x' + bytesToHex(addressHash);
}

/**
 * Hash data using SHA256
 * @param data Data to hash (string or Uint8Array)
 * @returns Hex-encoded hash
 *
 * @example
 * const h = hash("hello world");
 * console.log(h); // "b94d27b9..."
 */
export function hash(data: string | Uint8Array): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;

  return bytesToHex(sha256(bytes));
}

/**
 * Hash data using SHA256 (alias for backward compatibility)
 * @param data Data to hash
 * @returns Hex-encoded hash
 * @deprecated Use hash() instead
 */
export function hashData(data: string): string {
  return hash(data);
}

/**
 * Build a Merkle tree and return the root hash
 * Uses binary tree structure
 *
 * @param hashes Array of hex-encoded hashes
 * @returns Merkle root hash
 *
 * @example
 * const hashes = ["abc", "def", "ghi"];
 * const root = merkleRoot(hashes);
 * console.log(root); // "789xyz..."
 */
export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) {
    return hash('0');
  }

  if (hashes.length === 1) {
    return hashes[0];
  }

  return buildMerkleTree(hashes);
}

/**
 * Recursively build a Merkle tree
 * @param hashes Array of hashes at current level
 * @returns Root hash
 */
function buildMerkleTree(hashes: string[]): string {
  if (hashes.length === 1) {
    return hashes[0];
  }

  const newLevel: string[] = [];

  // Process pairs of hashes
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = i + 1 < hashes.length ? hashes[i + 1] : left; // Duplicate last if odd

    // Concatenate and hash the pair
    const combined = left + right;
    const pairHash = hash(combined);
    newLevel.push(pairHash);
  }

  // Recursively build the tree
  return buildMerkleTree(newLevel);
}

/**
 * Sign data with a private key using Ed25519
 * Data is hashed with SHA256 before signing
 *
 * @param data Data to sign
 * @param privateKey Hex-encoded private key
 * @returns Hex-encoded signature
 *
 * @example
 * const signature = await sign("hello", keys.privateKey);
 * console.log(signature); // "abc123..."
 */
export async function sign(data: string, privateKey: string): Promise<string> {
  const dataHash = sha256(new TextEncoder().encode(data));
  const privateKeyBytes = hexToBytes(privateKey);
  const signature = await ed25519.signAsync(dataHash, privateKeyBytes);

  return bytesToHex(signature);
}

/**
 * Verify a signature using Ed25519
 *
 * @param data Original data that was signed
 * @param signature Hex-encoded signature
 * @param publicKey Hex-encoded public key
 * @returns True if signature is valid
 *
 * @example
 * const isValid = await verify("hello", signature, keys.publicKey);
 * console.log(isValid); // true
 */
export async function verify(
  data: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const dataHash = sha256(new TextEncoder().encode(data));
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);

    return await ed25519.verifyAsync(signatureBytes, dataHash, publicKeyBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Sign a transaction (alias for sign)
 * @param message Message to sign
 * @param privateKey Hex-encoded private key
 * @returns Hex-encoded signature
 * @deprecated Use sign() instead
 */
export async function signTransaction(message: string, privateKey: string): Promise<string> {
  return sign(message, privateKey);
}

/**
 * Verify a signature (alias for verify)
 * @param message Original message
 * @param signature Hex-encoded signature
 * @param publicKey Hex-encoded public key
 * @returns True if valid
 * @deprecated Use verify() instead
 */
export async function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  return verify(message, signature, publicKey);
}

/**
 * Sign raw bytes with a private key
 * Does NOT hash the data first
 *
 * @param data Raw bytes to sign
 * @param privateKey Hex-encoded private key
 * @returns Hex-encoded signature
 */
export async function signRaw(data: Uint8Array, privateKey: string): Promise<string> {
  const privateKeyBytes = hexToBytes(privateKey);
  const signature = await ed25519.signAsync(data, privateKeyBytes);
  return bytesToHex(signature);
}

/**
 * Verify a signature on raw bytes
 * Does NOT hash the data first
 *
 * @param data Raw bytes that were signed
 * @param signature Hex-encoded signature
 * @param publicKey Hex-encoded public key
 * @returns True if valid
 */
export async function verifyRaw(
  data: Uint8Array,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);
    return await ed25519.verifyAsync(signatureBytes, data, publicKeyBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Hash multiple pieces of data together
 * @param data Array of strings to hash together
 * @returns Hex-encoded hash
 *
 * @example
 * const h = hashMultiple(["hello", "world", "123"]);
 */
export function hashMultiple(...data: string[]): string {
  const combined = data.join('');
  return hash(combined);
}

/**
 * Create a deterministic address from a seed
 * Useful for testing or deterministic wallets
 *
 * @param seed Seed string
 * @returns Address derived from seed
 *
 * @example
 * const addr = addressFromSeed("my-seed");
 * console.log(addr); // Always the same for "my-seed"
 */
export function addressFromSeed(seed: string): string {
  const seedHash = sha256(new TextEncoder().encode(seed));
  return '0x' + bytesToHex(seedHash);
}

/**
 * Derive a private key from a seed (for testing)
 * WARNING: Not cryptographically secure for production
 *
 * @param seed Seed string
 * @returns Hex-encoded private key
 */
export function privateKeyFromSeed(seed: string): string {
  const seedHash = sha256(new TextEncoder().encode(seed));
  // Ed25519 private keys are 32 bytes
  return bytesToHex(seedHash);
}

/**
 * Derive a key pair from a seed (for testing)
 * WARNING: Not cryptographically secure for production
 *
 * @param seed Seed string
 * @returns KeyPair derived from seed
 */
export async function keyPairFromSeed(seed: string): Promise<KeyPair> {
  const privateKey = privateKeyFromSeed(seed);
  const privateKeyBytes = hexToBytes(privateKey);
  const publicKey = await ed25519.getPublicKeyAsync(privateKeyBytes);

  return {
    publicKey: bytesToHex(publicKey),
    privateKey
  };
}

/**
 * Validate that a string is a valid hex-encoded hash
 * @param hash Hash string to validate
 * @returns True if valid hex hash
 */
export function isValidHash(hash: string): boolean {
  // Remove 0x prefix if present
  const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;

  // Check if valid hex and reasonable length (32 bytes = 64 hex chars for SHA256)
  return /^[0-9a-fA-F]{64}$/.test(cleanHash);
}

/**
 * Validate that a string is a valid public key
 * @param publicKey Public key string to validate
 * @returns True if valid public key
 */
export function isValidPublicKey(publicKey: string): boolean {
  const cleanKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

  // Ed25519 public keys are 32 bytes = 64 hex chars
  return /^[0-9a-fA-F]{64}$/.test(cleanKey);
}

/**
 * Validate that a string is a valid address
 * @param address Address string to validate
 * @returns True if valid address
 */
export function isValidAddress(address: string): boolean {
  if (!address.startsWith('0x')) {
    return false;
  }

  const cleanAddr = address.slice(2);

  // Addresses are SHA256 hashes = 64 hex chars
  return /^[0-9a-fA-F]{64}$/.test(cleanAddr);
}

/**
 * Convert bytes to hex with optional 0x prefix
 * @param bytes Byte array
 * @param prefix Whether to add "0x" prefix
 * @returns Hex string
 */
export function toHex(bytes: Uint8Array, prefix: boolean = false): string {
  const hex = bytesToHex(bytes);
  return prefix ? '0x' + hex : hex;
}

/**
 * Convert hex to bytes, handling optional 0x prefix
 * @param hex Hex string (with or without 0x)
 * @returns Byte array
 */
export function fromHex(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return hexToBytes(cleanHex);
}

/**
 * Generate a random nonce (number used once)
 * @returns Random 32-bit integer
 */
export function randomNonce(): number {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return new DataView(bytes.buffer).getUint32(0, false);
}

/**
 * Generate random bytes
 * @param length Number of bytes to generate
 * @returns Uint8Array of random bytes
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate a random hex string
 * @param length Number of bytes (result will be 2x this in hex chars)
 * @returns Random hex string
 */
export function randomHex(length: number): string {
  return bytesToHex(randomBytes(length));
}
