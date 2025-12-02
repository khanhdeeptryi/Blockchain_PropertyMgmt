import { useState } from 'react';
import { 
  uploadFileToIPFS, 
  pinJSONToIPFS, 
  validateFile, 
  isPinataConfigured,
  ipfsToHttp 
} from '../utils/ipfsService';
import { createEncryptedMetadata, hashData } from '../utils/encryption';

export default function AssetUpload({ account, onMint, onClose }) {
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    assetType: 'document',
    value: '',
    tags: ''
  });
  const [sensitiveMode, setSensitiveMode] = useState('none'); // none, hash, encrypt
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('form'); // form, uploading, success, error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    const previews = [];

    for (const file of selectedFiles) {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        continue;
      }
      validFiles.push(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews.push({ name: file.name, url: e.target.result, type: 'image' });
          setPreviewUrls([...previews]);
        };
        reader.readAsDataURL(file);
      } else {
        previews.push({ name: file.name, url: null, type: file.type });
      }
    }

    setFiles(validFiles);
    setPreviewUrls(previews);
  };

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadAndMint = async () => {
    if (!account) {
      setError('Vui lòng kết nối ví trước');
      return;
    }

    if (files.length === 0) {
      setError('Vui lòng chọn ít nhất một file');
      return;
    }

    if (!metadata.name || !metadata.description) {
      setError('Vui lòng điền đầy đủ tên và mô tả tài sản');
      return;
    }

    if (!isPinataConfigured()) {
      setError('Pinata chưa được cấu hình. Vui lòng thêm VITE_PINATA_JWT vào file .env');
      return;
    }

    try {
      setUploading(true);
      setStep('uploading');
      setError(null);
      setProgress(10);

      // Step 1: Upload files to IPFS
      const uploadedFiles = [];
      let imageCid = null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(10 + (i / files.length) * 40);
        
        const result = await uploadFileToIPFS(file, (p) => {
          setProgress(10 + (i / files.length) * 40 + (p / 100) * (40 / files.length));
        });
        
        uploadedFiles.push({
          name: file.name,
          ipfsUri: result.ipfsUri,
          ipfsCid: result.ipfsCid,
          mimeType: result.mimeType,
          size: result.size
        });

        // Use first image as NFT image
        if (!imageCid && file.type.startsWith('image/')) {
          imageCid = result.ipfsCid;
        }
      }

      setProgress(60);

      // Step 2: Build metadata
      const tags = metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : [];
      const attributes = [
        { trait_type: 'Loại tài sản', value: metadata.assetType },
        { trait_type: 'Số lượng files', value: uploadedFiles.length.toString() }
      ];

      if (metadata.value) {
        attributes.push({ trait_type: 'Giá trị ước tính', value: metadata.value });
      }

      tags.forEach(tag => {
        attributes.push({ trait_type: 'Tag', value: tag });
      });

      let finalMetadata = {
        name: metadata.name,
        description: metadata.description,
        image: imageCid ? `ipfs://${imageCid}` : '',
        docs: uploadedFiles.map(f => f.ipfsUri),
        attributes,
        files: uploadedFiles.map(f => ({
          name: f.name,
          uri: f.ipfsUri,
          mimeType: f.mimeType,
          size: f.size
        })),
        createdBy: account,
        createdAt: Math.floor(Date.now() / 1000)
      };

      // Step 3: Handle sensitive data
      let encryptionKey = null;
      if (sensitiveMode === 'hash') {
        const dataHash = await hashData(finalMetadata.description);
        finalMetadata.sensitiveHash = dataHash;
        finalMetadata._security = {
          mode: 'hash',
          note: 'Description hash included for verification'
        };
      } else if (sensitiveMode === 'encrypt') {
        const sensitiveFields = ['description', 'value'];
        const encrypted = await createEncryptedMetadata(finalMetadata, sensitiveFields);
        finalMetadata = encrypted.metadata;
        encryptionKey = encrypted.key;
        
        // Store encrypted fields separately (in practice, share with recipient)
        console.log('Encryption key (store securely):', encryptionKey);
        console.log('Encrypted fields:', encrypted.encryptedFields);
      }

      setProgress(75);

      // Step 4: Pin metadata to IPFS
      const metadataResult = await pinJSONToIPFS(finalMetadata, `asset-${metadata.name}`);
      setProgress(90);

      // Step 5: Prepare mint data
      const mintData = {
        to: account,
        tokenURI: metadataResult.metadataUri,
        metadata: finalMetadata,
        metadataCid: metadataResult.metadataCid,
        encryptionKey: encryptionKey,
        files: uploadedFiles
      };

      console.log('📦 Upload complete, mintData:', mintData);
      setResult(mintData);
      setProgress(100);
      setStep('success');

      // Call parent mint function
      if (onMint) {
        console.log('🚀 Calling onMint callback...');
        setTimeout(() => {
          console.log('⏰ Timeout fired, calling onMint now');
          onMint(mintData);
        }, 500);
      } else {
        console.warn('⚠️ onMint callback is not provided');
      }

    } catch (err) {
      console.error('❌ Upload and mint error:', err);
      setError(err.message || 'Lỗi khi upload và mint NFT');
      setStep('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="asset-upload-modal">
      <div className="upload-container">
        <div className="upload-header">
          <h2>Đăng ký tài sản mới</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 'form' && (
          <div className="upload-body">
            {/* File Upload */}
            <div className="form-group">
              <label>Upload tài liệu / hình ảnh</label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.svg"
                onChange={handleFileSelect}
                className="file-input"
              />
              <small className="form-help">
                Hỗ trợ: PDF, JPG, PNG, SVG (tối đa 20MB mỗi file)
              </small>
            </div>

            {/* File Preview */}
            {previewUrls.length > 0 && (
              <div className="file-preview-list">
                {previewUrls.map((preview, idx) => (
                  <div key={idx} className="file-preview-item">
                    {preview.type === 'image' ? (
                      <img src={preview.url} alt={preview.name} className="preview-image" />
                    ) : (
                      <div className="preview-icon">📄</div>
                    )}
                    <span className="preview-name">{preview.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Metadata Form */}
            <div className="form-group">
              <label>Tên tài sản *</label>
              <input
                type="text"
                className="form-input"
                value={metadata.name}
                onChange={(e) => handleMetadataChange('name', e.target.value)}
                placeholder="Ví dụ: Hợp đồng mua bán nhà đất"
                required
              />
            </div>

            <div className="form-group">
              <label>Mô tả chi tiết *</label>
              <textarea
                className="form-input"
                rows="4"
                value={metadata.description}
                onChange={(e) => handleMetadataChange('description', e.target.value)}
                placeholder="Mô tả đầy đủ về tài sản..."
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Loại tài sản</label>
                <select
                  className="form-input"
                  value={metadata.assetType}
                  onChange={(e) => handleMetadataChange('assetType', e.target.value)}
                >
                  <option value="document">Giấy tờ</option>
                  <option value="contract">Hợp đồng</option>
                  <option value="certificate">Chứng chỉ</option>
                  <option value="property">Bất động sản</option>
                  <option value="artwork">Tác phẩm nghệ thuật</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label>Giá trị ước tính</label>
                <input
                  type="text"
                  className="form-input"
                  value={metadata.value}
                  onChange={(e) => handleMetadataChange('value', e.target.value)}
                  placeholder="Ví dụ: 10,000,000 VND"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Tags (phân cách bằng dấu phẩy)</label>
              <input
                type="text"
                className="form-input"
                value={metadata.tags}
                onChange={(e) => handleMetadataChange('tags', e.target.value)}
                placeholder="Ví dụ: quan trọng, cá nhân, pháp lý"
              />
            </div>

            {/* Security Options */}
            <div className="form-group security-options">
              <label>Bảo mật dữ liệu nhạy cảm</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="security"
                    value="none"
                    checked={sensitiveMode === 'none'}
                    onChange={(e) => setSensitiveMode(e.target.value)}
                  />
                  <span>Không mã hóa (Public)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="security"
                    value="hash"
                    checked={sensitiveMode === 'hash'}
                    onChange={(e) => setSensitiveMode(e.target.value)}
                  />
                  <span>Hash (Verify only)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="security"
                    value="encrypt"
                    checked={sensitiveMode === 'encrypt'}
                    onChange={(e) => setSensitiveMode(e.target.value)}
                  />
                  <span>Mã hóa AES-256 (Private)</span>
                </label>
              </div>
              <small className="form-help">
                {sensitiveMode === 'encrypt' && '⚠️ Khóa mã hóa sẽ được hiển thị sau khi upload. Lưu giữ cẩn thận!'}
                {sensitiveMode === 'hash' && 'ℹ️ Chỉ lưu hash để xác minh, không thể khôi phục dữ liệu gốc'}
              </small>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="upload-actions">
              <button onClick={onClose} className="btn-secondary">
                Hủy
              </button>
              <button
                onClick={handleUploadAndMint}
                className="btn-primary"
                disabled={uploading || files.length === 0}
              >
                📤 Upload & Mint NFT
              </button>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="upload-body">
            <div className="progress-container">
              <h3>Đang xử lý...</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="progress-text">{progress}%</p>
              <div className="progress-steps">
                <p>✓ Upload files lên IPFS</p>
                <p>✓ Tạo metadata</p>
                <p>✓ Pin metadata lên IPFS</p>
                <p>⏳ Chuẩn bị mint NFT...</p>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && result && (
          <div className="upload-body">
            <div className="success-container">
              <div className="success-icon">✓</div>
              <h3>Upload thành công!</h3>
              <p>Metadata đã được pin lên IPFS. Sẵn sàng mint NFT.</p>
              
              <div className="result-details">
                <div className="detail-item">
                  <span className="detail-label">Metadata CID:</span>
                  <span className="detail-value monospace">{result.metadataCid}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Token URI:</span>
                  <span className="detail-value monospace">{result.tokenURI}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Files uploaded:</span>
                  <span className="detail-value">{result.files.length}</span>
                </div>
                {result.encryptionKey && (
                  <div className="detail-item encryption-key">
                    <span className="detail-label">🔑 Encryption Key:</span>
                    <textarea
                      className="key-display"
                      readOnly
                      value={result.encryptionKey}
                      rows="3"
                    />
                    <small className="warning-text">
                      ⚠️ Lưu khóa này để giải mã dữ liệu sau này!
                    </small>
                  </div>
                )}
              </div>

              <button onClick={onClose} className="btn-primary">
                Đóng
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="upload-body">
            <div className="error-container">
              <div className="error-icon">✕</div>
              <h3>Lỗi</h3>
              <p className="error-message">{error}</p>
              <div className="upload-actions">
                <button onClick={() => setStep('form')} className="btn-secondary">
                  Thử lại
                </button>
                <button onClick={onClose} className="btn-primary">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
