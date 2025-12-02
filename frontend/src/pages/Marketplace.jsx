import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function Marketplace({ account, nftContract, nftList, tokenContract, onRefresh }) {
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [listPrice, setListPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [assetMetadata, setAssetMetadata] = useState({});

  // Load marketplace listings from localStorage (simple implementation)
  useEffect(() => {
    const loadListings = () => {
      const stored = localStorage.getItem('nft_listings');
      if (stored) {
        const allListings = JSON.parse(stored);
        
        // Filter active listings
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
  }, [account]);

  // Load metadata for listed NFTs
  useEffect(() => {
    const loadMetadata = async () => {
      if (!nftContract) return;
      
      for (const listing of listings) {
        if (!assetMetadata[listing.tokenId]) {
          try {
            const uri = await nftContract.tokenURI(listing.tokenId);
            // Simple metadata fetch (you can enhance this)
            setAssetMetadata(prev => ({
              ...prev,
              [listing.tokenId]: { name: `Asset #${listing.tokenId}`, tokenURI: uri }
            }));
          } catch (error) {
            console.error('Failed to load metadata:', error);
          }
        }
      }
    };

    if (listings.length > 0) {
      loadMetadata();
    }
  }, [listings, nftContract]);

  // List NFT for sale
  const handleListNFT = async (nft) => {
    setSelectedNFT(nft);
    setShowListModal(true);
  };

  const confirmListing = async () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      alert('Vui lòng nhập giá hợp lệ');
      return;
    }

    setLoading(true);
    try {
      console.log('🏷️ Listing NFT', selectedNFT.tokenId, 'for', listPrice, 'MDT');

      // Create listing object
      const listing = {
        tokenId: selectedNFT.tokenId,
        seller: account,
        price: listPrice,
        tokenURI: selectedNFT.tokenURI,
        active: true,
        timestamp: Date.now()
      };

      // Save to localStorage (in real app, use smart contract)
      const stored = localStorage.getItem('nft_listings') || '[]';
      const allListings = JSON.parse(stored);
      allListings.push(listing);
      localStorage.setItem('nft_listings', JSON.stringify(allListings));

      alert('✅ NFT đã được đăng bán thành công!');
      setShowListModal(false);
      setListPrice('');
      setSelectedNFT(null);

      // Reload listings
      setListings(allListings.filter(l => l.active));
      setMyListings(allListings.filter(l => l.active && l.seller.toLowerCase() === account.toLowerCase()));

    } catch (error) {
      console.error('List NFT error:', error);
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Buy NFT
  const handleBuyNFT = async (listing) => {
    if (!account) {
      alert('⚠️ Vui lòng kết nối ví');
      return;
    }

    if (listing.seller.toLowerCase() === account.toLowerCase()) {
      alert('⚠️ Bạn không thể mua NFT của chính mình');
      return;
    }

    setLoading(true);
    try {
      console.log('💰 Buying NFT', listing.tokenId, 'for', listing.price, 'MDT');

      // Check buyer's token balance
      const balance = await tokenContract.balanceOf(account);
      const price = ethers.parseUnits(listing.price, 18);
      
      if (balance < price) {
        alert('❌ Số dư MDT không đủ');
        return;
      }

      // In real implementation:
      // 1. Approve marketplace contract to spend tokens
      // 2. Call marketplace contract to execute sale
      // 3. Transfer NFT from seller to buyer
      // 4. Transfer tokens from buyer to seller

      // Simplified demo: Just transfer token
      const tx = await tokenContract.transfer(listing.seller, price);
      console.log('💸 Payment transaction:', tx.hash);
      await tx.wait();

      // Mark listing as sold
      const stored = localStorage.getItem('nft_listings') || '[]';
      const allListings = JSON.parse(stored);
      const updated = allListings.map(l => 
        l.tokenId === listing.tokenId && l.seller === listing.seller 
          ? { ...l, active: false, buyer: account, soldAt: Date.now() }
          : l
      );
      localStorage.setItem('nft_listings', JSON.stringify(updated));

      alert(`✅ Đã mua NFT #${listing.tokenId} thành công!\n\nLưu ý: Trong demo này, chỉ chuyển token. Trong thực tế, NFT cũng sẽ được chuyển cho người mua.`);

      // Reload
      setListings(updated.filter(l => l.active));
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error('Buy NFT error:', error);
      alert('❌ Lỗi: ' + (error?.shortMessage || error.message));
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
                ℹ️ <strong>Demo marketplace:</strong> Trong bản demo này, listing được lưu trong localStorage. 
                Trong thực tế, bạn cần smart contract marketplace với các chức năng:
                <ul>
                  <li>✅ Approve NFT cho marketplace contract</li>
                  <li>✅ List NFT với giá</li>
                  <li>✅ Buy NFT (atomic swap: token ↔ NFT)</li>
                  <li>✅ Cancel listing</li>
                </ul>
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
