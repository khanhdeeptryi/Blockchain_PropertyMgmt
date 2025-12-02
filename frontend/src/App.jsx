import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, NFT_ADDRESS, TOKEN_ABI, NFT_ABI } from "./constants";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import TokenPage from "./pages/Token";
import NFTPage from "./pages/NFT";
import AssetManagement from "./pages/AssetManagement";
import "./App.css";

function App() {
  const [account, setAccount] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);

  const [ethBalance, setEthBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [nftList, setNftList] = useState([]);
  
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [nftUri, setNftUri] = useState("");
  const [txNotifications, setTxNotifications] = useState([]);
  const [tokenHistory, setTokenHistory] = useState([]);

  function getProvider() {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }

  async function getSigner() {
    const provider = getProvider();
    if (!provider) throw new Error("Không tìm thấy MetaMask");
    return await provider.getSigner();
  }

  function addNotification(statusText, message, status = 'pending', txHash = null) {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    setTxNotifications(prev => [{ statusText, message, status, txHash, timestamp }, ...prev.slice(0, 9)]);
  }

  async function checkNetwork() {
    try {
      const provider = getProvider();
      if (!provider) return;
      const net = await provider.getNetwork();
      if (Number(net.chainId) === 11155111) {
        setNetworkOk(true);
      } else {
        setNetworkOk(false);
      }
    } catch (e) {
      console.error(e);
      setNetworkOk(false);
    }
  }

  useEffect(() => {
    checkNetwork();
  }, []);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Hãy cài MetaMask trước đã.");
        return;
      }

      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const addr = accounts[0];

      setAccount(addr);
      await checkNetwork();
      await loadEthBalance(addr);
      await loadTokenBalance(addr);
      await loadNFTs(addr);
      addNotification('Thành công', 'Đã kết nối ví MetaMask', 'success');
    } catch (err) {
      console.error(err);
      addNotification('Lỗi', 'Lỗi kết nối ví: ' + (err?.shortMessage || err.message), 'error');
    }
  }

  async function loadEthBalance(addr) {
    try {
      const provider = getProvider();
      if (!provider) throw new Error("Không tìm thấy MetaMask");
      
      const balance = await provider.getBalance(addr);
      setEthBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTokenBalance(addr) {
    try {
      const provider = getProvider();
      if (!provider) throw new Error("Không tìm thấy MetaMask");

      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
      const bal = await token.balanceOf(addr);
      setTokenBalance(ethers.formatUnits(bal, 18));
    } catch (err) {
      console.error(err);
      addNotification('Lỗi', 'Lỗi đọc số dư MDT: ' + (err?.shortMessage || err.message), 'error');
    }
  }

  async function loadNFTs(addr) {
    console.log('📋 loadNFTs called for address:', addr);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("Không tìm thấy MetaMask");

      const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
      console.log('📋 NFT contract created at:', NFT_ADDRESS);
      
      // Since the contract doesn't have ERC721Enumerable, we need to query Transfer events
      console.log('📋 Querying Transfer events...');
      const filter = nft.filters.Transfer(null, addr);
      const events = await nft.queryFilter(filter, 0, 'latest');
      console.log('📋 Found', events.length, 'transfer events to this address');
      
      const nfts = [];
      const seenTokenIds = new Set();
      
      for (const event of events) {
        try {
          const tokenId = event.args.tokenId.toString();
          
          // Skip if we've already processed this token
          if (seenTokenIds.has(tokenId)) continue;
          seenTokenIds.add(tokenId);
          
          // Check if addr still owns this token
          const currentOwner = await nft.ownerOf(tokenId);
          if (currentOwner.toLowerCase() !== addr.toLowerCase()) {
            console.log(`📋 Token ${tokenId} no longer owned by ${addr}`);
            continue;
          }
          
          console.log(`📋 Loading metadata for token ${tokenId}...`);
          const uri = await nft.tokenURI(tokenId);
          console.log(`📋 TokenURI for ${tokenId}:`, uri);
          
          nfts.push({ tokenId, tokenURI: uri, owner: addr });
        } catch (e) {
          console.error('❌ Error loading NFT:', e);
        }
      }
      
      console.log('📋 Total NFTs loaded:', nfts.length, nfts);
      setNftList(nfts);
    } catch (err) {
      console.error('❌ loadNFTs error:', err);
    }
  }

  async function handleTransferToken(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!account) {
      addNotification('Cảnh báo', 'Hãy kết nối ví trước.', 'warning');
      return;
    }
    try {
      addNotification('Đang xử lý', 'Đang gửi giao dịch chuyển MDT...', 'pending');

      const signer = await getSigner();
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      const amount = ethers.parseUnits(transferAmount || "0", 18);
      const tx = await token.transfer(transferTo, amount);
      
      addNotification('Đang chờ', `Giao dịch đã gửi: ${tx.hash}`, 'pending', tx.hash);
      await tx.wait();

      addNotification('Thành công', 'Chuyển MDT thành công!', 'success', tx.hash);
      
      // Add to history
      setTokenHistory(prev => [{
        hash: tx.hash,
        type: 'Transfer',
        amount: transferAmount,
        to: transferTo,
        timestamp: new Date().toLocaleString('vi-VN')
      }, ...prev]);
      
      await loadTokenBalance(account);
      setTransferTo("");
      setTransferAmount("");
    } catch (err) {
      console.error(err);
      addNotification('Lỗi', 'Lỗi giao dịch MDT: ' + (err?.shortMessage || err.message), 'error');
    }
  }

  async function handleMintNft(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!account) {
      addNotification('Cảnh báo', 'Hãy kết nối ví trước.', 'warning');
      return;
    }
    try {
      addNotification('Đang xử lý', 'Đang gửi giao dịch mint NFT...', 'pending');

      const signer = await getSigner();
      const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);

      const tx = await nft.safeMint(account, nftUri || "demo-uri");
      
      addNotification('Đang chờ', `Giao dịch đã gửi: ${tx.hash}`, 'pending', tx.hash);
      await tx.wait();

      addNotification('Thành công', 'Mint NFT thành công!', 'success', tx.hash);
      await loadNFTs(account);
      setNftUri("");
    } catch (err) {
      console.error(err);
      addNotification('Lỗi', 'Lỗi giao dịch NFT: ' + (err?.shortMessage || err.message), 'error');
    }
  }

  async function handleMintAsset(uploadData) {
    console.log('🎨 handleMintAsset called with:', uploadData);
    if (!account) {
      addNotification('Cảnh báo', 'Hãy kết nối ví trước.', 'warning');
      return;
    }
    try {
      addNotification('Đang xử lý', 'Đang mint NFT tài sản...', 'pending');

      const signer = await getSigner();
      const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);

      console.log('📝 Calling safeMint with to:', uploadData.to, 'tokenURI:', uploadData.tokenURI);
      const tx = await nft.safeMint(uploadData.to, uploadData.tokenURI);
      
      console.log('✅ Transaction sent:', tx.hash);
      addNotification('Đang chờ', `Giao dịch đã gửi: ${tx.hash}`, 'pending', tx.hash);
      await tx.wait();

      console.log('✅ Transaction confirmed:', tx.hash);
      addNotification('Thành công', `Mint tài sản "${uploadData.metadata.name}" thành công!`, 'success', tx.hash);
      
      console.log('🔄 Reloading NFTs...');
      await loadNFTs(account);
      console.log('✅ NFTs reloaded');
    } catch (err) {
      console.error('❌ Mint error:', err);
      addNotification('Lỗi', 'Lỗi mint tài sản: ' + (err?.shortMessage || err.message), 'error');
    }
  }

  async function handleTransferAsset(tokenId, toAddress) {
    if (!account) {
      throw new Error('Hãy kết nối ví trước.');
    }
    try {
      addNotification('Đang xử lý', 'Đang chuyển nhượng NFT...', 'pending');

      const signer = await getSigner();
      const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);

      const tx = await nft.transferFrom(account, toAddress, tokenId);
      
      addNotification('Đang chờ', `Giao dịch đã gửi: ${tx.hash}`, 'pending', tx.hash);
      await tx.wait();

      addNotification('Thành công', `Chuyển nhượng NFT #${tokenId} thành công!`, 'success', tx.hash);
      await loadNFTs(account);
    } catch (err) {
      console.error(err);
      addNotification('Lỗi', 'Lỗi chuyển nhượng: ' + (err?.shortMessage || err.message), 'error');
      throw err;
    }
  }

  return (
    <BrowserRouter>
      <div className="layout">
        <NavBar account={account} networkOk={networkOk} onConnect={connectWallet} />

        <main className="container">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  account={account}
                  networkOk={networkOk}
                  ethBalance={ethBalance}
                  tokenBalance={tokenBalance}
                  nftCount={nftList.length}
                  txNotifications={txNotifications}
                  refreshBalance={() => {
                    if (account) {
                      loadEthBalance(account);
                      loadTokenBalance(account);
                      loadNFTs(account);
                    }
                  }}
                />
              }
            />
            <Route
              path="/token"
              element={
                <TokenPage
                  transferTo={transferTo}
                  setTransferTo={setTransferTo}
                  transferAmount={transferAmount}
                  setTransferAmount={setTransferAmount}
                  handleTransferToken={handleTransferToken}
                  tokenHistory={tokenHistory}
                  tokenBalance={tokenBalance}
                />
              }
            />
            <Route
              path="/nft"
              element={
                <NFTPage 
                  nftUri={nftUri} 
                  setNftUri={setNftUri} 
                  handleMintNft={handleMintNft}
                  nftList={nftList}
                />
              }
            />
            <Route
              path="/assets"
              element={
                <AssetManagement
                  account={account}
                  nftContract={null}
                  nftList={nftList}
                  onRefresh={() => account && loadNFTs(account)}
                  onMintAsset={handleMintAsset}
                  onTransferAsset={handleTransferAsset}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
  