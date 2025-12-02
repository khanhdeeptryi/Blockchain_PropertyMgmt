import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TOKEN_ADDRESS, NFT_ADDRESS, TOKEN_ABI, NFT_ABI } from '../constants';

function Marketplace({ account, nftList, getSigner, addNotification, onRefresh }) {
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [listPrice, setListPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [assetMetadata, setAssetMetadata] = useState({});

  // Load marketplace listings from localStorage (simple implementation)
  useEffect(() => {
    const loadListings = async () => {
      const stored = localStorage.getItem('nft_listings');
      if (stored) {
        const allListings = JSON.parse(stored);
        
        // Check for completed transfers and clean up
        if (getSigner && account) {
          try {
            const signer = await getSigner();
            const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
            
            let hasChanges = false;
            const updatedListings = await Promise.all(
              allListings.map(async (listing) => {
                // If listing is sold but not yet confirmed as transferred
                if (!listing.active && listing.buyer && listing.soldAt && !listing.transferred) {
                  try {
                    // Check current owner
                    const currentOwner = await nftContract.ownerOf(listing.tokenId);
                    
                    // If buyer now owns the NFT, mark as transferred
                    if (currentOwner.toLowerCase() === listing.buyer.toLowerCase()) {
                      console.log(`✅ NFT #${listing.tokenId} has been transferred to buyer`);
                      hasChanges = true;
                      return { ...listing, transferred: true, transferredAt: Date.now() };
                    }
                  } catch (error) {
                    console.error(`Error checking owner of token ${listing.tokenId}:`, error);
                  }
                }
                return listing;
              })
            );
            
            if (hasChanges) {
              localStorage.setItem('nft_listings', JSON.stringify(updatedListings));
              console.log('📋 Updated listings with transfer status');
            }
            
            // Filter active listings
            const active = updatedListings.filter(l => l.active);
            setListings(active);
            
            // Filter user's listings
            if (account) {
              const mine = active.filter(l => l.seller.toLowerCase() === account.toLowerCase());
              setMyListings(mine);
            }
            
            return;
          } catch (error) {
            console.error('Error checking transfers:', error);
          }
        }
        
        // Fallback: just filter active listings
        const active = allListings.filter(l => l.active);
        setListings(active);
        
        // Filter user's listings
        if (account) {
          const mine = active.filter(l => l.seller.toLowerCase() === account.toLowerCase());
          setMyListings(mine);
        }
      }
    };

    loadListings();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadListings, 5000);
    return () => clearInterval(interval);
  }, [account, getSigner]);

  // Load metadata for listed NFTs
  useEffect(() => {
    const loadMetadata = async () => {
      if (!getSigner) return;
      
      try {
        const signer = await getSigner();
        const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
        
        for (const listing of listings) {
          if (!assetMetadata[listing.tokenId]) {
            try {
              const uri = await nftContract.tokenURI(listing.tokenId);
              setAssetMetadata(prev => ({
                ...prev,
                [listing.tokenId]: { name: `Asset #${listing.tokenId}`, tokenURI: uri }
              }));
            } catch (error) {
              console.error('Failed to load metadata:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to get signer:', error);
      }
    };

    if (listings.length > 0) {
      loadMetadata();
    }
  }, [listings, getSigner]);

  // List NFT for sale
  const handleListNFT = async (nft) => {
    setSelectedNFT(nft);
    setShowListModal(true);
  };

  const confirmListing = async () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      addNotification('Cảnh báo', 'Vui lòng nhập giá hợp lệ', 'warning');
      return;
    }

    setLoading(true);
    try {
      console.log('🏷️ Listing NFT', selectedNFT.tokenId, 'for', listPrice, 'MDT');

      addNotification('Đang xử lý', 'Đang approve NFT...', 'pending');

      // IMPORTANT: Approve NFT for transfer
      // In production, this should approve marketplace contract
      // For demo: We'll store approval in listing metadata
      
      const signer = await getSigner();
      const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
      
      // Check if already approved (optional step)
      // const approved = await nftContract.getApproved(selectedNFT.tokenId);
      // console.log('Current approved address:', approved);

      // Create listing object with seller signature
      const listing = {
        tokenId: selectedNFT.tokenId,
        seller: account,
        price: listPrice,
        tokenURI: selectedNFT.tokenURI,
        active: true,
        timestamp: Date.now(),
        nftApproved: true // Mark as ready for transfer
      };

      // Save to localStorage (in real app, use smart contract)
      const stored = localStorage.getItem('nft_listings') || '[]';
      const allListings = JSON.parse(stored);
      allListings.push(listing);
      localStorage.setItem('nft_listings', JSON.stringify(allListings));

      addNotification('Thành công', 'NFT đã được đăng bán thành công!', 'success');
      setShowListModal(false);
      setListPrice('');
      setSelectedNFT(null);

      // Reload listings
      setListings(allListings.filter(l => l.active));
      setMyListings(allListings.filter(l => l.active && l.seller.toLowerCase() === account.toLowerCase()));

    } catch (error) {
      console.error('List NFT error:', error);
      addNotification('Lỗi', 'Lỗi đăng bán: ' + (error?.shortMessage || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Buy NFT
  const handleBuyNFT = async (listing) => {
    if (!account) {
      addNotification('Cảnh báo', 'Vui lòng kết nối ví', 'warning');
      return;
    }

    if (listing.seller.toLowerCase() === account.toLowerCase()) {
      addNotification('Cảnh báo', 'Bạn không thể mua NFT của chính mình', 'warning');
      return;
    }

    setLoading(true);
    try {
      console.log('💰 Buying NFT', listing.tokenId, 'for', listing.price, 'MDT');

      addNotification('Đang xử lý', 'Đang kiểm tra số dư...', 'pending');

      // Get signer and create contract instances
      const signer = await getSigner();
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      // Check buyer's token balance
      const balance = await tokenContract.balanceOf(account);
      const price = ethers.parseUnits(listing.price, 18);
      
      if (balance < price) {
        addNotification('Lỗi', 'Số dư MDT không đủ để mua NFT này', 'error');
        setLoading(false);
        return;
      }

      addNotification('Đang xử lý', `Đang chuyển ${listing.price} MDT...`, 'pending');

      // Step 1: Transfer token payment
      const tx = await tokenContract.transfer(listing.seller, price);
      console.log('💸 Payment transaction:', tx.hash);
      
      addNotification('Đang chờ', `Đang xác nhận giao dịch thanh toán...`, 'pending', tx.hash);
      await tx.wait();

      addNotification('Thành công', `Đã thanh toán ${listing.price} MDT!`, 'success', tx.hash);

      // Step 2: Mark listing as sold (buyer has paid)
      const stored = localStorage.getItem('nft_listings') || '[]';
      const allListings = JSON.parse(stored);
      const updated = allListings.map(l => 
        l.tokenId === listing.tokenId && l.seller === listing.seller 
          ? { ...l, active: false, buyer: account, soldAt: Date.now(), paymentTx: tx.hash }
          : l
      );
      localStorage.setItem('nft_listings', JSON.stringify(updated));

      // Step 3: Notify about NFT transfer requirement
      addNotification(
        'Quan trọng', 
        `✅ Đã thanh toán! ⚠️ Seller cần vào "Quản lý Tài sản" → Chọn NFT #${listing.tokenId} → "Chuyển nhượng" đến địa chỉ: ${account.slice(0,6)}...${account.slice(-4)}`, 
        'warning'
      );

      console.log(`
📢 ACTION REQUIRED FOR SELLER (${listing.seller}):
1. Go to "Quản lý Tài sản" page
2. Find NFT #${listing.tokenId}
3. Click "Chuyển nhượng"
4. Transfer to buyer: ${account}
5. Payment received: ${tx.hash}
      `);

      // Reload
      setListings(updated.filter(l => l.active));
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error('Buy NFT error:', error);
      addNotification('Lỗi', 'Lỗi mua NFT: ' + (error?.shortMessage || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel listing
  const handleCancelListing = async (listing) => {
    try {
      console.log('❌ Cancelling listing for NFT', listing.tokenId);

      // Remove from localStorage
      const stored = localStorage.getItem('nft_listings') || '[]';
      const allListings = JSON.parse(stored);
      const updated = allListings.map(l => 
        l.tokenId === listing.tokenId && l.seller === listing.seller 
          ? { ...l, active: false, cancelledAt: Date.now() }
          : l
      );
      localStorage.setItem('nft_listings', JSON.stringify(updated));

      alert('✅ Đã hủy đăng bán');

      // Reload
      setListings(updated.filter(l => l.active));
      setMyListings(updated.filter(l => l.active && l.seller.toLowerCase() === account.toLowerCase()));

    } catch (error) {
      console.error('Cancel listing error:', error);
      alert('❌ Lỗi: ' + error.message);
    }
  };

  return (
    <div className="page marketplace">
      <div className="page-header">
        <h1>🏪 NFT Marketplace</h1>
        <p>Mua bán NFT với token MDT</p>
      </div>

      {!account && (
        <div className="alert alert-warning">
          ⚠️ Vui lòng kết nối ví để sử dụng marketplace
        </div>
      )}

      {/* Pending Transfers - Seller needs to transfer NFT */}
      {account && (() => {
        const stored = localStorage.getItem('nft_listings') || '[]';
        const allListings = JSON.parse(stored);
        const pendingTransfers = allListings.filter(
          l => !l.active && 
               l.seller.toLowerCase() === account.toLowerCase() && 
               l.buyer && 
               l.soldAt &&
               !l.transferred  // Only show if NOT yet transferred
        );
        
        if (pendingTransfers.length > 0) {
          return (
            <div className="alert alert-warning" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>⚠️ Cần hoàn tất giao dịch ({pendingTransfers.length})</h3>
                  <p style={{ marginBottom: '1rem' }}>
                    Bạn đã nhận được thanh toán cho các NFT sau. Vui lòng vào <strong>"Quản lý Tài sản"</strong> để chuyển NFT cho người mua:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {pendingTransfers.map(t => (
                      <li key={t.tokenId} style={{ marginBottom: '0.5rem' }}>
                        <strong>NFT #{t.tokenId}</strong> → Chuyển đến: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{t.buyer}</code>
                        <br />
                        <small>Đã thanh toán: {t.price} MDT | Thời gian: {new Date(t.soldAt).toLocaleString('vi-VN')}</small>
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="btn-small btn-secondary"
                  style={{ marginLeft: '1rem', whiteSpace: 'nowrap' }}
                >
                  🔄 Làm mới
                </button>
              </div>
              <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                💡 <strong>Mẹo:</strong> Sau khi chuyển nhượng xong, hệ thống sẽ tự động cập nhật trong 5 giây hoặc bạn có thể click "Làm mới".
              </p>
            </div>
          );
        }
        return null;
      })()}

      {/* User's NFTs - Available to List */}
      {account && nftList && nftList.length > 0 && (
        <div className="marketplace-section">
          <h2>NFT của bạn</h2>
          <p className="section-subtitle">Chọn NFT để đăng bán</p>
          
          <div className="nft-grid">
            {nftList.map((nft) => {
              const isListed = myListings.some(l => l.tokenId === nft.tokenId);
              
              return (
                <div key={nft.tokenId} className="nft-card">
                  <div className="nft-image">
                    <div className="placeholder-icon">🖼️</div>
                  </div>
                  <div className="nft-info">
                    <h3>NFT #{nft.tokenId}</h3>
                    <p className="nft-uri">{nft.tokenURI?.substring(0, 30)}...</p>
                    {isListed ? (
                      <div className="listing-badge">Đang bán</div>
                    ) : (
                      <button 
                        onClick={() => handleListNFT(nft)}
                        className="btn-primary btn-small"
                      >
                        🏷️ Đăng bán
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Active Listings */}
      {myListings.length > 0 && (
        <div className="marketplace-section">
          <h2>Đang bán của bạn</h2>
          <div className="listings-grid">
            {myListings.map((listing, idx) => {
              const metadata = assetMetadata[listing.tokenId] || {};
              return (
                <div key={idx} className="listing-card">
                  <div className="listing-image">
                    <div className="placeholder-icon">🖼️</div>
                  </div>
                  <div className="listing-info">
                    <h3>{metadata.name || `NFT #${listing.tokenId}`}</h3>
                    <div className="listing-price">
                      <span className="price-label">Giá:</span>
                      <span className="price-value">{listing.price} MDT</span>
                    </div>
                    <div className="listing-actions">
                      <button 
                        onClick={() => handleCancelListing(listing)}
                        className="btn-danger btn-small"
                      >
                        ❌ Hủy bán
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Active Listings */}
      <div className="marketplace-section">
        <h2>NFTs đang bán</h2>
        {listings.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có NFT nào đang được bán</p>
          </div>
        ) : (
          <div className="listings-grid">
            {listings.map((listing, idx) => {
              const metadata = assetMetadata[listing.tokenId] || {};
              const isOwner = account && listing.seller.toLowerCase() === account.toLowerCase();
              
              return (
                <div key={idx} className="listing-card">
                  <div className="listing-image">
                    <div className="placeholder-icon">🖼️</div>
                  </div>
                  <div className="listing-info">
                    <h3>{metadata.name || `NFT #${listing.tokenId}`}</h3>
                    <div className="listing-seller">
                      <span className="seller-label">Người bán:</span>
                      <span className="seller-address">
                        {listing.seller.substring(0, 6)}...{listing.seller.substring(38)}
                      </span>
                    </div>
                    <div className="listing-price">
                      <span className="price-label">Giá:</span>
                      <span className="price-value">{listing.price} MDT</span>
                    </div>
                    <div className="listing-actions">
                      {isOwner ? (
                        <button className="btn-secondary btn-small" disabled>
                          NFT của bạn
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleBuyNFT(listing)}
                          className="btn-primary btn-small"
                          disabled={loading}
                        >
                          💰 Mua ngay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* List NFT Modal */}
      {showListModal && (
        <div className="modal-overlay" onClick={() => setShowListModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏷️ Đăng bán NFT</h2>
              <button onClick={() => setShowListModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>NFT Token ID:</label>
                <input type="text" value={selectedNFT?.tokenId || ''} disabled />
              </div>
              <div className="form-group">
                <label>Giá bán (MDT):</label>
                <input 
                  type="number" 
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="Nhập giá bán..."
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="alert alert-info">
                ℹ️ <strong>Quy trình mua bán:</strong>
                <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                  <li><strong>Seller đăng bán:</strong> NFT được list với giá MDT</li>
                  <li><strong>Buyer thanh toán:</strong> Chuyển MDT token cho seller</li>
                  <li><strong>Seller transfer NFT:</strong> Vào "Quản lý Tài sản" → "Chuyển nhượng" đến buyer</li>
                  <li><strong>Hoàn tất:</strong> Buyer nhận được NFT</li>
                </ol>
                <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  <strong>⚠️ Lưu ý:</strong> Sau khi buyer thanh toán, bạn sẽ nhận được thông báo cần transfer NFT.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowListModal(false)} className="btn-secondary">
                Hủy
              </button>
              <button 
                onClick={confirmListing} 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận đăng bán'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Marketplace;
