/**
 * IPFS Service using Pinata for file and JSON pinning
 * Requires VITE_PINATA_JWT and VITE_PINATA_GATEWAY env variables
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud';

// Backup IPFS gateways in case primary fails
const IPFS_GATEWAYS = [
  PINATA_GATEWAY,
  'https://ipfs.io',
  'https://cloudflare-ipfs.com',
  'https://gateway.ipfs.io'
];

/**
 * Get Pinata JWT from environment
 */
function getPinataJWT() {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  if (!jwt) {
    throw new Error('VITE_PINATA_JWT not configured. Please add to .env file.');
  }
  return jwt;
}

/**
 * Upload file to IPFS via Pinata
 * @param {File} file - File object from input
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise<{ipfsCid: string, ipfsUri: string, size: number, mimeType: string}>}
 */
export async function uploadFileToIPFS(file, onProgress = null) {
  try {
    const jwt = getPinataJWT();
    const formData = new FormData();
    formData.append('file', file);
    
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedAt: Date.now().toString(),
        originalName: file.name,
        mimeType: file.type
      }
    });
    formData.append('pinataMetadata', metadata);

    const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const ipfsCid = data.IpfsHash;
    const ipfsUri = `ipfs://${ipfsCid}`;

    if (onProgress) onProgress(100);

    return {
      ipfsCid,
      ipfsUri,
      size: file.size,
      mimeType: file.type
    };
  } catch (error) {
    console.error('IPFS file upload error:', error);
    throw error;
  }
}

/**
 * Pin JSON metadata to IPFS via Pinata
 * @param {Object} metadata - Metadata object (ERC-721 standard)
 * @param {string} name - Name for Pinata metadata
 * @returns {Promise<{metadataCid: string, metadataUri: string}>}
 */
export async function pinJSONToIPFS(metadata, name = 'asset-metadata') {
  try {
    const jwt = getPinataJWT();

    const body = {
      pinataMetadata: {
        name,
        keyvalues: {
          uploadedAt: Date.now().toString(),
          type: 'metadata'
        }
      },
      pinataContent: metadata
    };

    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata JSON pin failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const metadataCid = data.IpfsHash;
    const metadataUri = `ipfs://${metadataCid}`;

    return {
      metadataCid,
      metadataUri
    };
  } catch (error) {
    console.error('IPFS JSON pin error:', error);
    throw error;
  }
}

/**
 * Convert IPFS URI to HTTP gateway URL
 * @param {string} ipfsUri - ipfs://CID or ipfs://CID/path
 * @param {number} gatewayIndex - Index of gateway to use (default 0)
 * @returns {string} HTTP URL
 */
export function ipfsToHttp(ipfsUri, gatewayIndex = 0) {
  if (!ipfsUri) return '';
  if (ipfsUri.startsWith('http')) return ipfsUri;
  
  const cid = ipfsUri.replace('ipfs://', '');
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  return `${gateway}/ipfs/${cid}`;
}

/**
 * Fetch metadata from IPFS URI with fallback gateways
 * @param {string} ipfsUri - ipfs://CID
 * @returns {Promise<Object>} Metadata object
 */
export async function fetchMetadataFromIPFS(ipfsUri) {
  console.log('🌐 fetchMetadataFromIPFS - Input URI:', ipfsUri);
  
  // Try each gateway until one succeeds
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    try {
      const httpUrl = ipfsToHttp(ipfsUri, i);
      console.log(`🌐 Trying gateway ${i + 1}/${IPFS_GATEWAYS.length}: ${httpUrl}`);
      
      const response = await fetch(httpUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('🌐 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Metadata fetched successfully from gateway', i + 1, ':', data);
      return data;
    } catch (error) {
      console.warn(`⚠️ Gateway ${i + 1} failed:`, error.message);
      
      // If this is the last gateway, throw the error
      if (i === IPFS_GATEWAYS.length - 1) {
        console.error('❌ All gateways failed');
        throw new Error(`Failed to fetch metadata from all ${IPFS_GATEWAYS.length} gateways: ${error.message}`);
      }
      // Otherwise, continue to next gateway
    }
  }
}

/**
 * Validate file type and size
 * @param {File} file
 * @param {number} maxSizeMB - Max size in MB (default 20MB)
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateFile(file, maxSizeMB = 20) {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Loại file không được hỗ trợ. Chỉ chấp nhận: PDF, JPG, PNG, SVG`
    };
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File quá lớn. Tối đa ${maxSizeMB}MB (file hiện tại: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Check if Pinata is configured
 * @returns {boolean}
 */
export function isPinataConfigured() {
  return !!import.meta.env.VITE_PINATA_JWT;
}
