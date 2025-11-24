import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, NFT_ADDRESS, TOKEN_ABI, NFT_ABI } from "./constants";

function App() {
  const [account, setAccount] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);

  const [tokenBalance, setTokenBalance] = useState("-");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [nftUri, setNftUri] = useState("");
  const [txStatus, setTxStatus] = useState("");

  // tiện: tạo provider/signer
  function getProvider() {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }

  async function getSigner() {
    const provider = getProvider();
    if (!provider) throw new Error("Không tìm thấy MetaMask");
    return await provider.getSigner();
  }

  // Kiểm tra network có phải Sepolia không
  async function checkNetwork() {
    try {
      const provider = getProvider();
      if (!provider) return;
      const net = await provider.getNetwork();
      // chainId Sepolia = 11155111
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

  // 1) Kết nối ví
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
      await loadTokenBalance(addr);
    } catch (err) {
      console.error(err);
      setTxStatus("Lỗi kết nối ví: " + (err?.shortMessage || err.message));
    }
  }

  // 2) Đọc số dư MDT (READ data)
  async function loadTokenBalance(addr) {
    try {
      const provider = getProvider();
      if (!provider) throw new Error("Không tìm thấy MetaMask");

      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
      const bal = await token.balanceOf(addr);
      // MDT dùng 18 decimals
      setTokenBalance(ethers.formatUnits(bal, 18));
    } catch (err) {
      console.error(err);
      setTxStatus("Lỗi đọc số dư MDT: " + (err?.shortMessage || err.message));
    }
  }

  // 3) Gửi giao dịch: chuyển MDT
  async function handleTransferToken(e) {
    e.preventDefault();
    if (!account) {
      setTxStatus("Hãy kết nối ví trước.");
      return;
    }
    try {
      setTxStatus("Đang gửi giao dịch chuyển MDT...");

      const signer = await getSigner();
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      const amount = ethers.parseUnits(transferAmount || "0", 18);
      const tx = await token.transfer(transferTo, amount);
      await tx.wait();

      setTxStatus("Chuyển MDT thành công!");
      await loadTokenBalance(account);
    } catch (err) {
      console.error(err);
      setTxStatus("Lỗi giao dịch MDT: " + (err?.shortMessage || err.message));
    }
  }

  // 4) Gửi giao dịch: mint NFT (safeMint(address to, string uri))
  async function handleMintNft(e) {
    e.preventDefault();
    if (!account) {
      setTxStatus("Hãy kết nối ví trước.");
      return;
    }
    try {
      setTxStatus("Đang gửi giao dịch mint NFT...");

      const signer = await getSigner();
      const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);

      // MyDAppNFT.safeMint(address to, string uri)
      const tx = await nft.safeMint(account, nftUri || "demo-uri");
      await tx.wait();

      setTxStatus("Mint NFT thành công!");
    } catch (err) {
      console.error(err);
      setTxStatus("Lỗi giao dịch NFT: " + (err?.shortMessage || err.message));
    }
  }

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <h1>DApp Quản lý Tài sản (MDT + MDN)</h1>

      {/* Trạng thái network */}
      <p>
        Network:{" "}
        {networkOk ? "✅ Sepolia" : "⚠️ Không phải Sepolia (hãy chuyển trên MetaMask)"}
      </p>

      {/* Kết nối ví */}
      <button onClick={connectWallet}>
        {account ? `Đã kết nối: ${account.slice(0, 6)}...${account.slice(-4)}` : "Kết nối MetaMask"}
      </button>

      <hr />

      {/* Thông tin tài khoản */}
      <h2>Thông tin tài khoản</h2>
      <p>Địa chỉ: {account || "-"}</p>
      <p>Số dư MDT: {tokenBalance}</p>

      <hr />

      {/* Form chuyển MDT */}
      <h2>Chuyển MDT (ERC-20)</h2>
      <form onSubmit={handleTransferToken}>
        <div style={{ marginBottom: 8 }}>
          <label>Đến địa chỉ:&nbsp;</label>
          <input
            style={{ width: "420px" }}
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Số lượng MDT:&nbsp;</label>
          <input
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="10"
          />
        </div>
        <button type="submit">Gửi giao dịch</button>
      </form>

      <hr />

      {/* Form mint NFT */}
      <h2>Mint NFT Tài sản (ERC-721)</h2>
      <form onSubmit={handleMintNft}>
        <div style={{ marginBottom: 8 }}>
          <label>Metadata URI:&nbsp;</label>
          <input
            style={{ width: "420px" }}
            value={nftUri}
            onChange={(e) => setNftUri(e.target.value)}
            placeholder="https://... hoặc ipfs://..."
          />
        </div>
        <button type="submit">Mint NFT</button>
      </form>

      <hr />

      {/* Hiển thị trạng thái giao dịch */}
      <h2>Trạng thái giao dịch</h2>
      <p>{txStatus || "Chưa có giao dịch nào."}</p>
    </div>
  );
}

export default App;
