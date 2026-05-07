const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

async function loadSodium() {
	const imported = await import('libsodium-wrappers-sumo');
	const sodium = imported.default ?? imported;
	await sodium.ready;
	if (typeof sodium.randombytes_buf !== 'function') {
		throw new Error('Host encryption could not load browser crypto support.');
	}
	return sodium;
}

function toBase64(sodium, bytes) {
	return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

function fromBase64(sodium, value) {
	return sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
}

function deriveKey(sodium, passphrase, salt, opsLimit, memLimit) {
	return sodium.crypto_pwhash(
		sodium.crypto_secretbox_KEYBYTES,
		TEXT_ENCODER.encode(passphrase.normalize('NFKC')),
		salt,
		opsLimit,
		memLimit,
		sodium.crypto_pwhash_ALG_ARGON2ID13,
	);
}

export async function encryptHostConfig(config, passphrase, options = {}) {
	if (!passphrase || typeof passphrase !== 'string') {
		throw new Error('A passphrase is required to encrypt a host.');
	}
	const sodium = await loadSodium();
	const opsLimit = Number(options.opsLimit ?? sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE);
	const memLimit = Number(options.memLimit ?? sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE);
	const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
	const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
	const key = deriveKey(sodium, passphrase, salt, opsLimit, memLimit);
	const message = TEXT_ENCODER.encode(JSON.stringify(config ?? {}));
	const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);
	return {
		version: 1,
		algorithm: 'secretbox',
		kdf: {
			algorithm: 'argon2id',
			opsLimit,
			memLimit,
		},
		salt: toBase64(sodium, salt),
		nonce: toBase64(sodium, nonce),
		ciphertext: toBase64(sodium, ciphertext),
	};
}

export async function decryptHostConfig(envelope, passphrase) {
	if (!passphrase || typeof passphrase !== 'string') {
		throw new Error('A passphrase is required to decrypt a host.');
	}
	if (!envelope || typeof envelope !== 'object') {
		throw new Error('A valid encrypted host envelope is required.');
	}
	const sodium = await loadSodium();
	const salt = fromBase64(sodium, envelope.salt);
	const nonce = fromBase64(sodium, envelope.nonce);
	const ciphertext = fromBase64(sodium, envelope.ciphertext);
	const key = deriveKey(
		sodium,
		passphrase,
		salt,
		Number(envelope.kdf?.opsLimit ?? sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE),
		Number(envelope.kdf?.memLimit ?? sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE),
	);
	const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
	if (!plaintext) {
		throw new Error('Unable to decrypt host config. Check the passphrase.');
	}
	return JSON.parse(TEXT_DECODER.decode(plaintext));
}

export const encryptCloudflareHostConfig = encryptHostConfig;
export const decryptCloudflareHostConfig = decryptHostConfig;
