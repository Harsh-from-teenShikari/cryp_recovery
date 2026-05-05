use wasm_bindgen::prelude::*;
use k256::elliptic_curve::sec1::ToEncodedPoint;
use sha3::{Keccak256, Digest};

/// Mine a chunk of the integer space. Returns JSON string with result.
#[wasm_bindgen]
pub fn mine_chunk(start: &str, end: &str, target_address: &str) -> JsValue {
    let start_int: u128 = start.parse().unwrap_or(0);
    let end_int: u128 = end.parse().unwrap_or(0);
    let target_lower = target_address.to_lowercase().replace("0x", "");

    let mut keys_checked: u64 = 0;

    for i in start_int..=end_int {
        keys_checked += 1;

        // 1. Build 32-byte big-endian private key from the integer
        let mut pk_bytes = [0u8; 32];
        let i_bytes = i.to_be_bytes(); // 16 bytes for u128
        pk_bytes[16..].copy_from_slice(&i_bytes);

        // 2. Derive public key on secp256k1 using NonZeroScalar -> PublicKey
        let scalar = match k256::NonZeroScalar::try_from(&pk_bytes[..]) {
            Ok(s) => s,
            Err(_) => continue, // skip invalid keys (e.g. 0)
        };
        let public_key = k256::PublicKey::from_secret_scalar(&scalar);
        let point = public_key.to_encoded_point(false); // uncompressed
        let pub_bytes = point.as_bytes();

        // 3. Keccak-256 hash of the public key (skip the 0x04 prefix byte)
        let mut hasher = Keccak256::new();
        hasher.update(&pub_bytes[1..]);
        let hash = hasher.finalize();

        // 4. Last 20 bytes = Ethereum address
        let addr_bytes = &hash[12..];
        let derived = hex::encode(addr_bytes);

        // 5. Compare
        if derived == target_lower {
            let result = format!(
                r#"{{"found":true,"address":"0x{}","privateKey":"{}","keysChecked":{}}}"#,
                derived,
                hex::encode(pk_bytes),
                keys_checked
            );
            return JsValue::from_str(&result);
        }
    }

    // No match found
    let result = format!(
        r#"{{"found":false,"address":"","privateKey":"","keysChecked":{}}}"#,
        keys_checked
    );
    JsValue::from_str(&result)
}

/// Quick benchmark: derive N addresses and return H/s estimate
#[wasm_bindgen]
pub fn benchmark(count: u32) -> f64 {
    let start = js_sys::Date::now();
    let base: u128 = 1_000_000_000;

    for i in 0..count as u128 {
        let val = base + i;
        let mut pk_bytes = [0u8; 32];
        let i_bytes = val.to_be_bytes();
        pk_bytes[16..].copy_from_slice(&i_bytes);

        let scalar = match k256::NonZeroScalar::try_from(&pk_bytes[..]) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let public_key = k256::PublicKey::from_secret_scalar(&scalar);
        let point = public_key.to_encoded_point(false);

        let mut hasher = Keccak256::new();
        hasher.update(&point.as_bytes()[1..]);
        let _hash = hasher.finalize();
    }

    let elapsed = (js_sys::Date::now() - start) / 1000.0;
    if elapsed > 0.0 {
        count as f64 / elapsed
    } else {
        0.0
    }
}
