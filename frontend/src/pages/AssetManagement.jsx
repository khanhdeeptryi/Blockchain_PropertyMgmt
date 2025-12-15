import { useState, useEffect } from 'react';
import { ipfsToHttp, fetchMetadataFromIPFS } from '../utils/ipfsService';
import { decryptData } from '../utils/encryption';
import AssetUpload from '../components/AssetUpload';

export default function AssetManagement({ 
  account, 
  nftContract, 
  nftList, 
  onRefresh,
  onMintAsset,
  onTransferAsset 
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetMetadata, setAssetMetadata] = useState({});
  const [decryptedData, setDecryptedData] = useState({});
  const [decryptKey, setDecryptKey] = useState('');
  const [showDecryptModal, setShowDecryptModal] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [showTransfer, setShowTransfer] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load metadata for NFTs
  useEffect(() => {
    const loadMetadata = async () => {
      console.log('🎨 Loading metadata for', nftList.length, 'NFTs');
      for (const nft of nftList) {
        console.log(`🎨 Processing NFT ${nft.tokenId}, tokenURI:`, nft.tokenURI);
        if (!assetMetadata[nft.tokenId] && nft.tokenURI) {
          try {
            console.log(`🎨 Fetching metadata for token ${nft.tokenId}...`);
            const metadata = await fetchMetadataFromIPFS(nft.tokenURI);
            console.log(`✅ Metadata loaded for token ${nft.tokenId}:`, metadata);
            setAssetMetadata(prev => ({
              ...prev,
              [nft.tokenId]: metadata
            }));
          } catch (error) {
            console.error(`❌ Failed to load metadata for token ${nft.tokenId}:`, error);
          }
        }
      }
    };
    
    if (nftList.length > 0) {
      loadMetadata();
    }
  }, [nftList]);

  const handleMintFromUpload = async (uploadData) => {
    console.log('🎯 handleMintFromUpload called with:', uploadData);
    setShowUpload(false);
    if (onMintAsset) {
      console.log('🔄 Calling onMintAsset...');
      await onMintAsset(uploadData);
      console.log('✅ onMintAsset completed');
    } else {
      console.warn('⚠️ onMintAsset is not provided');
    }
  };

  const handleTransfer = async (tokenId) => {
    if (!transferTo || !account) return;
    
    setLoading(true);
    try {
      await onTransferAsset(tokenId, transferTo);
      setShowTransfer(null);
      setTransferTo('');
      alert('Chuyển nhượng thành công!');
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Lỗi chuyển nhượng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (ipfsUri, filename) => {
    const httpUrl = ipfsToHttp(ipfsUri);
    window.open(httpUrl, '_blank');
  };

  const handleDecrypt = async (tokenId) => {
    if (!decryptKey) {
      alert('Vui lòng nhập encryption key');
      return;
    }

    try {
      const metadata = assetMetadata[tokenId];
      if (!metadata || !metadata.encryption) {
        alert('Asset này không có dữ liệu mã hóa');
        return;
      }

      console.log('🔓 Decrypting data for token', tokenId);

      // Import key from base64
      const keyData = Uint8Array.from(atob(decryptKey), c => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decrypt fields
      const decrypted = {};
      
      if (metadata.encryption.encryptedFields.includes('description')) {
        decrypted.description = await decryptData(metadata.description, cryptoKey);
      }

      const valueAttr = metadata.attributes?.find(a => a.trait_type === 'Estimated Value');
      if (valueAttr && metadata.encryption.encryptedFields.includes('estimatedValue')) {
        decrypted.estimatedValue = await decryptData(valueAttr.value, cryptoKey);
      }

      setDecryptedData(prev => ({
        ...prev,
        [tokenId]: decrypted
      }));

      setShowDecryptModal(null);
      setDecryptKey('');
      alert('✅ Giải mã thành công!');

    } catch (error) {
      console.error('Decrypt error:', error);
      alert('❌ Lỗi giải mã: Key không đúng hoặc dữ liệu bị lỗi');
    }
  };

  return (
    <div className="page asset-management">
      <div className="page-header">
        <h1>Quản lý Tài sản NFT</h1>
        <div className="header-actions">
          <button onClick={onRefresh} className="btn-secondary">
            🔄 Làm mới
          </button>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            Đăng ký tài sản mới
          </button>
        </div>
      </div>

      {!account && (
        <div className="alert alert-warning">
          ⚠️ Vui lòng kết nối ví để xem và quản lý tài sản
        </div>
      )}

      {nftList.length === 0 && account && (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>Chưa có tài sản nào</h3>
          <p>Bắt đầu bằng cách đăng ký tài sản mới</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            Đăng ký tài sản đầu tiên
          </button>
        </div>
      )}

      {nftList.length > 0 && (
        <div className="asset-grid">
          {nftList.map((nft) => {
            const metadata = assetMetadata[nft.tokenId];
            return (
              <div key={nft.tokenId} className="asset-card">
                <div className="asset-image">
                  {metadata?.image ? (
                    <img 
                      src={ipfsToHttp(metadata.image)} 
                      alt={metadata.name}
                      onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="asset-placeholder">📄</div>
                  )}
                </div>
                
                <div className="asset-info">
                  <h3 className="asset-title">
                    {metadata?.name || `Asset #${nft.tokenId}`}
                  </h3>
                  <p className="asset-description">
                    {metadata?.description?.substring(0, 100) || 'Loading metadata...'}
                    {metadata?.description?.length > 100 && '...'}
                  </p>
                  
                  {metadata?.attributes && (
                    <div className="asset-attributes">
                      {metadata.attributes.slice(0, 3).map((attr, idx) => (
                        <span key={idx} className="attribute-badge">
                          {attr.trait_type}: {attr.value}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="asset-meta">
                    <span className="token-id">Token ID: {nft.tokenId}</span>
                    {metadata?.files && (
                      <span className="file-count">📎 {metadata.files.length} files</span>
                    )}
                  </div>

                  <div className="asset-actions">
                    <button 
                      onClick={() => setSelectedAsset(nft.tokenId)}
                      className="btn-small btn-primary"
                    >
                      Xem chi tiết
                    </button>
                    {metadata?.encryption && (
                      <button
                        onClick={() => setShowDecryptModal(nft.tokenId)}
                        className="btn-small btn-warning"
                        title="Giải mã dữ liệu"
                      >
                        🔓 Decrypt
                      </button>
                    )}
                    <button 
                      onClick={() => setShowTransfer(nft.tokenId)}
                      className="btn-small btn-secondary"
                    >
                      Chuyển nhượng
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AssetUpload
              account={account}
              onMint={handleMintFromUpload}
              onClose={() => setShowUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
          <div className="modal asset-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết tài sản #{selectedAsset}</h3>
              <button className="modal-close" onClick={() => setSelectedAsset(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              {assetMetadata[selectedAsset] ? (
                <>
                  <div className="detail-section">
                    <h4>Thông tin cơ bản</h4>
                    <div className="detail-row">
                      <span className="detail-label">Tên:</span>
                      <span className="detail-value">{assetMetadata[selectedAsset].name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Mô tả:</span>
                      <span className="detail-value">
                        {decryptedData[selectedAsset]?.description || assetMetadata[selectedAsset].description}
                        {assetMetadata[selectedAsset].encryption?.encryptedFields.includes('description') && 
                         !decryptedData[selectedAsset]?.description && 
                         <span className="encrypted-badge"> 🔒 Đã mã hóa</span>
                        }
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Người tạo:</span>
                      <span className="detail-value monospace">
                        {assetMetadata[selectedAsset].createdBy}
                      </span>
                    </div>
                    {assetMetadata[selectedAsset].createdAt && (
                      <div className="detail-row">
                        <span className="detail-label">Ngày tạo:</span>
                        <span className="detail-value">
                          {new Date(assetMetadata[selectedAsset].createdAt * 1000).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {assetMetadata[selectedAsset].attributes && (
                    <div className="detail-section">
                      <h4>Thuộc tính</h4>
                      <div className="attributes-grid">
                        {assetMetadata[selectedAsset].attributes.map((attr, idx) => (
                          <div key={idx} className="attribute-item">
                            <span className="attr-label">{attr.trait_type}</span>
                            <span className="attr-value">{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {assetMetadata[selectedAsset].files && (
                    <div className="detail-section">
                      <h4>Tài liệu đính kèm ({assetMetadata[selectedAsset].files.length})</h4>
                      <div className="files-list">
                        {assetMetadata[selectedAsset].files.map((file, idx) => (
                          <div key={idx} className="file-item">
                            <div className="file-icon">
                              {file.mimeType?.startsWith('image/') ? '🖼️' : '📄'}
                            </div>
                            <div className="file-info">
                              <div className="file-name">{file.name}</div>
                              <div className="file-meta">
                                {file.mimeType} • {(file.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <button
                              onClick={() => downloadFile(file.uri, file.name)}
                              className="btn-small"
                            >
                              Tải xuống
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {assetMetadata[selectedAsset]._encrypted && (
                    <div className="detail-section alert-warning">
                      <h4>🔒 Dữ liệu được mã hóa</h4>
                      <p>
                        Một số trường dữ liệu được mã hóa: {assetMetadata[selectedAsset]._encrypted.fields.join(', ')}
                      </p>
                      <p>Cần khóa giải mã để xem nội dung đầy đủ.</p>
                    </div>
                  )}

                  {assetMetadata[selectedAsset].sensitiveHash && (
                    <div className="detail-section">
                      <h4>Mã hash xác thực</h4>
                      <div className="detail-row">
                        <span className="detail-label">Hash:</span>
                        <span className="detail-value monospace small">
                          {assetMetadata[selectedAsset].sensitiveHash}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="detail-section">
                    <h4>Blockchain</h4>
                    <div className="detail-row">
                      <span className="detail-label">Token URI:</span>
                      <span className="detail-value monospace small">
                        {nftList.find(n => n.tokenId === selectedAsset)?.tokenURI}
                      </span>
                    </div>
                    <a
                      href={`https://sepolia.etherscan.io/token/${nftList.find(n => n.tokenId === selectedAsset)?.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      Xem trên Etherscan →
                    </a>
                  </div>
                </>
              ) : (
                <p>Đang tải metadata...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-overlay" onClick={() => setShowTransfer(null)}>
          <div className="modal transfer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chuyển nhượng tài sản #{showTransfer}</h3>
              <button className="modal-close" onClick={() => setShowTransfer(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Địa chỉ người nhận *</label>
                <input
                  type="text"
                  className="form-input"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <div className="alert alert-info">
                <p>
                  ℹ️ Sau khi chuyển nhượng, bạn sẽ không còn sở hữu tài sản này. 
                  Người nhận sẽ có toàn quyền kiểm soát.
                </p>
                {assetMetadata[showTransfer]?._encrypted && (
                  <p className="warning-text">
                    ⚠️ Tài sản này có dữ liệu mã hóa. Hãy chia sẻ khóa giải mã 
                    với người nhận qua kênh bảo mật.
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button onClick={() => setShowTransfer(null)} className="btn-secondary">
                  Hủy
                </button>
                <button
                  onClick={() => handleTransfer(showTransfer)}
                  className="btn-primary"
                  disabled={!transferTo || loading}
                >
                  {loading ? 'Đang chuyển...' : 'Xác nhận chuyển nhượng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decrypt Modal */}
      {showDecryptModal && (
        <div className="modal-overlay" onClick={() => setShowDecryptModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔓 Giải mã dữ liệu</h3>
              <button className="modal-close" onClick={() => setShowDecryptModal(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              <p className="text-secondary mb-2">
                Nhập encryption key để giải mã các trường dữ liệu đã được mã hóa.
              </p>
              
              <div className="form-group">
                <label>Encryption Key (Base64)</label>
                <textarea
                  value={decryptKey}
                  onChange={(e) => setDecryptKey(e.target.value)}
                  placeholder="Nhập key bạn đã lưu khi upload..."
                  rows={4}
                  className="form-control"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </div>

              <div className="alert alert-info">
                ℹ️ Key này được tạo khi bạn upload tài sản với tùy chọn "Encrypt sensitive data". 
                Bạn cần lưu key này để có thể giải mã dữ liệu sau này.
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDecryptModal(null)} className="btn-secondary">
                Hủy
              </button>
              <button
                onClick={() => handleDecrypt(showDecryptModal)}
                className="btn-primary"
                disabled={!decryptKey}
              >
                🔓 Giải mã
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
