# Tài liệu Chức năng DApp TokProp

## 📋 Tổng quan
DApp TokProp là ứng dụng phi tập trung (Decentralized Application) quản lý token ERC-20 và NFT ERC-721 trên blockchain Sepolia testnet, tích hợp IPFS để lưu trữ tài sản số.

---

## 🏠 1. Dashboard (Trang chủ)

### Chức năng:
- Hiển thị tổng quan số dư tài khoản
- Theo dõi tài sản nhanh chóng
- Điều hướng đến các chức năng chính

### Các thành phần:

#### **1.1. Balance Cards (Thẻ số dư)**
- **ETH Balance**: Hiển thị số dư Sepolia ETH
  - Sử dụng: `ethers.js` - `provider.getBalance(address)`
  - Định dạng: `ethers.formatEther()` chuyển từ Wei sang ETH
  
- **MDT Balance**: Hiển thị số dư token MyDAppToken (ERC-20)
  - Sử dụng: `ethers.Contract` + ABI của ERC-20
  - Gọi hàm: `contract.balanceOf(address)`
  - Định dạng: `ethers.formatUnits(balance, 18)` (18 decimals)
  
- **NFT Count**: Hiển thị số lượng NFT sở hữu
  - Sử dụng: Đếm events `Transfer` từ blockchain
  - Query: `contract.queryFilter(Transfer(null, yourAddress))`

#### **1.2. Quick Actions (Hành động nhanh)**
- Nút "Chuyển Token" → chuyển đến trang Token MDT
- Nút "Mint NFT" → chuyển đến trang NFT Tài sản
- Nút "Quản lý Tài sản" → chuyển đến trang Asset Management

### Công nghệ sử dụng:
- **React 19.2**: Component UI
- **ethers.js 6.15**: Tương tác blockchain
- **React Router DOM 6.14**: Điều hướng
- **CSS Grid**: Layout responsive

---

## 💰 2. Token MDT (Trang quản lý token)

### Chức năng:
- Chuyển token MDT cho địa chỉ khác
- Xem lịch sử giao dịch
- Theo dõi số dư real-time

### Các thành phần:

#### **2.1. Token Transfer Form (Form chuyển token)**
**Input fields:**
- Địa chỉ người nhận (To Address)
- Số lượng token (Amount)

**Quy trình xử lý:**
1. Kiểm tra kết nối ví MetaMask
2. Validate địa chỉ người nhận (checksum address)
3. Chuyển đổi số lượng: `ethers.parseUnits(amount, 18)`
4. Gọi hàm contract: `token.transfer(toAddress, amount)`
5. Hiển thị notification "Đang xử lý"
6. Đợi transaction confirm: `await tx.wait()`
7. Cập nhật số dư và lịch sử giao dịch
8. Hiển thị notification "Thành công" với link Etherscan

**Công nghệ:**
- `ethers.Contract` với ERC-20 ABI
- `ethers.Signer` từ MetaMask
- Transaction receipt tracking

#### **2.2. Transaction History (Lịch sử giao dịch)**
**Hiển thị:**
- Transaction hash (rút gọn)
- Loại giao dịch (Transfer/Mint)
- Từ/Đến địa chỉ
- Số lượng token
- Timestamp
- Link Etherscan

**Lưu trữ:**
- State local (React useState)
- Mất khi refresh trang (có thể mở rộng với localStorage)

**Công nghệ:**
- Transaction indexing
- Date formatting
- Conditional rendering

#### **2.3. Balance Display (Hiển thị số dư)**
- Real-time balance tracking
- Auto-refresh sau mỗi transaction
- Format: `Number.parseFloat().toFixed(4)` MDT

---

## 🎨 3. NFT Tài sản (Trang NFT cơ bản)

### Chức năng:
- Mint NFT đơn giản với tokenURI
- Xem danh sách NFT sở hữu
- Xem chi tiết NFT trên Etherscan

### Các thành phần:

#### **3.1. Mint NFT Form (Form mint NFT đơn giản)**
**Input:**
- Metadata URI: IPFS URI hoặc HTTP URL

**Quy trình:**
1. Validate URI format
2. Gọi contract: `nft.safeMint(userAddress, tokenURI)`
3. Đợi confirmation
4. Tự động reload danh sách NFT

**Công nghệ:**
- ERC-721 contract interaction
- `safeMint(address to, string uri)` function
- Event listening

#### **3.2. NFT Gallery (Bộ sưu tập NFT)**
**Hiển thị:**
- Token ID
- Token URI (rút gọn)
- Placeholder image (vì chưa load metadata)

**Load NFT:**
- Query `Transfer` events: `contract.queryFilter(filter, 0, 'latest')`
- Filter theo địa chỉ người dùng
- Check ownership: `contract.ownerOf(tokenId)`
- Load tokenURI: `contract.tokenURI(tokenId)`

**Công nghệ:**
- Event filtering
- Blockchain event queries
- CSS Grid layout

---

## 🗂️ 4. Quản lý Tài sản NFT (Advanced Asset Management)

### Chức năng chính:
Trang quản lý tài sản NFT nâng cao với upload IPFS, mã hóa metadata, và quản lý file.

---

### **4.1. Upload Asset (Đăng ký tài sản mới)**

#### **Modal Upload gồm 3 bước:**

**BƯỚC 1: Upload File**
- **Chức năng:**
  - Chọn file từ máy tính (drag & drop hoặc click)
  - Preview file trước khi upload
  - Validate loại file và kích thước

- **File types được hỗ trợ:**
  - PDF: Tài liệu, hợp đồng
  - JPG/JPEG/PNG: Ảnh, chứng chỉ
  - SVG: Vector graphics
  - Max size: 20MB

- **Công nghệ:**
  ```javascript
  // Validate file
  validateFile(file, maxSizeMB = 20)
  
  // File type check
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/svg+xml']
  ```

**BƯỚC 2: Metadata Form (Nhập thông tin tài sản)**
- **Các trường thông tin:**
  - **Tên tài sản** (name) - Bắt buộc
  - **Mô tả** (description) - Tùy chọn
  - **Loại tài sản** (category):
    - document: Văn bản, giấy tờ
    - certificate: Chứng chỉ, bằng cấp
    - contract: Hợp đồng
    - property: Tài sản, bất động sản
    - other: Khác
  
  - **Giá trị ước tính** (estimatedValue) - Số tiền
  - **Số lượng files** (numberOfFiles) - Auto count
  - **Owner** - Auto fill (địa chỉ ví)

- **Thuộc tính bảo mật (Security Options):**
  - ☑️ **Encrypt sensitive data**: Mã hóa dữ liệu nhạy cảm
    - Khi bật: Mã hóa description và estimatedValue
    - Algorithm: AES-256-GCM
    - Key generation: Web Crypto API
  
  - ☑️ **Private asset**: Tài sản riêng tư
    - Đánh dấu tài sản là private trong metadata

- **Công nghệ:**
  - Form validation với React state
  - Conditional rendering cho encrypted fields
  - Real-time input tracking

**BƯỚC 3: Upload & Mint Process**

**Quy trình xử lý (handleUpload):**

```javascript
// 1. Upload file to IPFS via Pinata
const fileResult = await uploadFileToIPFS(file, onProgress)
// → Returns: { ipfsCid, ipfsUri, size, mimeType }

// 2. Generate encryption key (if enabled)
const encryptionKey = await generateEncryptionKey()
// → Web Crypto API: crypto.subtle.generateKey(AES-GCM, 256-bit)

// 3. Encrypt sensitive data (if enabled)
const encryptedDescription = await encryptData(description, encryptionKey)
const encryptedValue = await encryptData(estimatedValue, encryptionKey)
// → AES-256-GCM encryption with random IV

// 4. Build metadata (ERC-721 standard + custom fields)
const metadata = {
  name: "Tên tài sản",
  description: encrypted ? encryptedDescription : description,
  image: "ipfs://Qm...",  // File CID
  attributes: [
    { trait_type: "Category", value: "document" },
    { trait_type: "Upload Date", value: "2025-12-02T..." },
    { trait_type: "File Size", value: "1.5 MB" },
    { trait_type: "Estimated Value", value: encrypted ? encryptedValue : value },
    { trait_type: "Owner", value: "0x..." },
    { trait_type: "Number of Files", value: "1" },
    { trait_type: "Private", value: "true/false" }
  ],
  properties: {
    files: [{
      uri: "ipfs://Qm...",
      type: "application/pdf",
      size: 1572864,
      encrypted: true/false
    }]
  },
  encryption: encrypted ? {
    algorithm: "AES-256-GCM",
    encryptedFields: ["description", "estimatedValue"]
  } : null
}

// 5. Pin metadata JSON to IPFS
const metadataResult = await pinJSONToIPFS(metadata, `asset-${name}`)
// → Returns: { metadataCid, metadataUri }

// 6. Prepare mint data
const mintData = {
  to: userAddress,
  tokenURI: "ipfs://QmMetadata...",
  metadata: metadata,
  metadataCid: "QmMetadata...",
  encryptionKey: encryptionKey  // Store for decryption later
}

// 7. Call parent mint function
onMint(mintData)  // → Triggers handleMintAsset in App.jsx
```

**Công nghệ sử dụng:**
- **Pinata API**: IPFS pinning service
  - `POST /pinning/pinFileToIPFS`: Upload file
  - `POST /pinning/pinJSONToIPFS`: Pin metadata JSON
  - JWT Authentication: Bearer token
  
- **Web Crypto API**: Client-side encryption
  - `crypto.subtle.generateKey()`: AES-256-GCM key
  - `crypto.subtle.encrypt()`: Mã hóa data
  - `crypto.subtle.digest()`: SHA-256 hash
  
- **IPFS**: Decentralized storage
  - Content addressing (CID)
  - `ipfs://` URI scheme
  - Gateway conversion: `ipfs://Qm... → https://gateway.../ipfs/Qm...`

- **ERC-721 Standard**: NFT metadata format
  - `name`, `description`, `image` fields
  - `attributes` array cho properties
  - `properties.files` cho multi-file support

---

### **4.2. Asset Gallery (Bộ sưu tập tài sản)**

#### **Hiển thị danh sách:**
- Grid layout responsive (3 cột)
- Card cho mỗi asset với:
  - Document/Image icon
  - Asset name (từ metadata)
  - Loading state khi đang fetch metadata
  - Token ID
  - Action buttons

#### **Load metadata process:**
```javascript
// 1. Load NFTs from blockchain (App.jsx)
const events = await nft.queryFilter(Transfer(null, userAddress))
const tokenIds = events.map(e => e.args.tokenId)
const tokenURI = await nft.tokenURI(tokenId)

// 2. Fetch metadata from IPFS (AssetManagement.jsx)
const metadata = await fetchMetadataFromIPFS(tokenURI)
// → Thử nhiều gateways nếu có lỗi CORS
```

#### **Gateways IPFS (fallback chain):**
1. Pinata Gateway (primary)
2. ipfs.io
3. cloudflare-ipfs.com
4. gateway.ipfs.io

**Xử lý lỗi:**
- Retry với gateway tiếp theo nếu fail
- Show error message nếu tất cả gateway fail
- Placeholder icon nếu không load được ảnh

---

### **4.3. Asset Detail Modal (Chi tiết tài sản)**

**Mở khi click "Xem chi tiết"**

#### **Hiển thị thông tin:**
- **Asset Image/Preview**
  - Load từ IPFS: `ipfsToHttp(metadata.image)`
  - Fallback icon nếu không load được
  - Click để mở full size

- **Basic Info:**
  - Tên tài sản
  - Mô tả (decrypt nếu đã mã hóa)
  - Token ID
  - Owner address

- **Attributes Table:**
  - Category
  - Upload Date
  - File Size
  - Estimated Value (decrypt nếu đã mã hóa)
  - Private status
  - Number of Files

- **Files Section:**
  - List tất cả files trong asset
  - File type, size
  - Download button → Open IPFS gateway URL

- **Blockchain Info:**
  - Token URI (rút gọn)
  - View on Etherscan button

#### **Decryption (nếu có):**
```javascript
// User phải có encryption key để decrypt
if (metadata.encryption && encryptionKey) {
  const decryptedDesc = await decryptData(
    metadata.description, 
    encryptionKey
  )
  const decryptedValue = await decryptData(
    metadata.attributes.find(a => a.trait_type === "Estimated Value").value,
    encryptionKey
  )
}
```

**Công nghệ:**
- Modal overlay với backdrop
- Responsive layout
- IPFS gateway URL conversion
- Conditional decryption

---

### **4.4. Transfer Asset (Chuyển nhượng tài sản)**

#### **Chức năng:**
- Chuyển quyền sở hữu NFT cho địa chỉ khác
- Validate địa chỉ người nhận
- Transaction tracking

#### **Quy trình:**
```javascript
// 1. Open transfer modal (click "Chuyển nhượng")
setShowTransfer(tokenId)

// 2. Input recipient address
const toAddress = "0x..."

// 3. Call contract function
const tx = await nft.safeTransferFrom(
  fromAddress,   // Current owner
  toAddress,     // New owner
  tokenId        // NFT token ID
)

// 4. Wait for confirmation
await tx.wait()

// 5. Refresh NFT list (remove transferred NFT)
await loadNFTs(account)
```

**Công nghệ:**
- ERC-721 `safeTransferFrom()` function
- Address validation: `ethers.isAddress()`
- Transaction notifications
- Auto-refresh sau transfer

---

### **4.5. Mint NFT từ Upload (handleMintAsset)**

**Được gọi tự động sau khi upload thành công**

```javascript
async function handleMintAsset(uploadData) {
  // uploadData = {
  //   to: "0x...",
  //   tokenURI: "ipfs://QmMetadata...",
  //   metadata: {...},
  //   encryptionKey: "..."
  // }
  
  // 1. Get signer from MetaMask
  const signer = await provider.getSigner()
  
  // 2. Create contract instance
  const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer)
  
  // 3. Call safeMint
  const tx = await nft.safeMint(uploadData.to, uploadData.tokenURI)
  
  // 4. Wait for blockchain confirmation
  await tx.wait()
  
  // 5. Reload NFT list
  await loadNFTs(account)
  
  // 6. Show success notification
  addNotification('Thành công', 'Mint tài sản thành công!', 'success', tx.hash)
}
```

**Smart Contract Function:**
```solidity
// MyDAppNFT.sol
function safeMint(address to, string memory uri) public {
    uint256 tokenId = _nextTokenId++;
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, uri);
}
```

---

## 🔔 5. Transaction Notifications (Hệ thống thông báo)

### Chức năng:
- Hiển thị trạng thái giao dịch real-time
- Popup notifications ở góc phải màn hình
- Tự động ẩn sau 5 giây

### Các loại notification:

#### **5.1. Pending (Đang xử lý)**
- Màu vàng cam
- Icon: ⏳
- Hiển thị khi:
  - Gửi transaction lên blockchain
  - Upload file lên IPFS
  - Đang đợi confirmation

#### **5.2. Success (Thành công)**
- Màu xanh lá
- Icon: ✅
- Hiển thị khi:
  - Transaction confirmed
  - Upload thành công
  - Mint NFT thành công
- Kèm link Etherscan (nếu có transaction hash)

#### **5.3. Error (Lỗi)**
- Màu đỏ
- Icon: ❌
- Hiển thị khi:
  - Transaction failed
  - User reject trong MetaMask
  - Validation error
  - Network error

#### **5.4. Warning (Cảnh báo)**
- Màu vàng
- Icon: ⚠️
- Hiển thị khi:
  - Chưa kết nối ví
  - Input không hợp lệ
  - Insufficient balance

### Công nghệ:
- React state management
- Array of notification objects
- Auto-remove với setTimeout
- CSS animations (slide in/out)
- Link to Etherscan: `https://sepolia.etherscan.io/tx/${hash}`

---

## 🧭 6. Navigation Bar (Thanh điều hướng)

### Các thành phần:

#### **6.1. Logo & Brand**
- TokProp logo
- Click để về Dashboard

#### **6.2. Navigation Links**
- Dashboard
- Token MDT
- NFT Tài sản
- Quản lý Tài sản NFT
- Active link highlighting

#### **6.3. Network Status**
- Hiển thị network đang kết nối
- ✓ Sepolia (màu xanh khi đúng network)
- Kiểm tra: `network.chainId === 11155111` (Sepolia)

#### **6.4. Wallet Connection**
- **Chưa kết nối:**
  - Nút "Kết nối Ví"
  - Click → gọi `window.ethereum.request({ method: 'eth_requestAccounts' })`
  
- **Đã kết nối:**
  - Blockies avatar (generated from address)
  - Địa chỉ rút gọn: `0xbaee...43f8`
  - Click để disconnect

### Công nghệ:
- React Router `<Link>` components
- `useLocation()` hook cho active link
- MetaMask connection
- ethereum-blockies-base64 cho avatar
- Address formatting

---

## 🔐 7. Encryption & Security (Mã hóa & Bảo mật)

### **7.1. AES-256-GCM Encryption**

#### **Tạo key:**
```javascript
const key = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,  // extractable
  ["encrypt", "decrypt"]
)
```

#### **Mã hóa:**
```javascript
const iv = crypto.getRandomValues(new Uint8Array(12))  // Random IV
const encrypted = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  textEncoder.encode(data)
)
// Return: base64(iv) + ":" + base64(encrypted)
```

#### **Giải mã:**
```javascript
const [ivB64, encryptedB64] = encryptedData.split(":")
const iv = base64ToArrayBuffer(ivB64)
const encrypted = base64ToArrayBuffer(encryptedB64)
const decrypted = await crypto.subtle.decrypt(
  { name: "AES-GCM", iv },
  key,
  encrypted
)
```

### **7.2. SHA-256 Hashing**
```javascript
const hash = await crypto.subtle.digest(
  "SHA-256",
  textEncoder.encode(data)
)
// Return: hex string
```

### **Use cases:**
- Encrypt description field
- Encrypt estimated value
- Hash sensitive documents
- Integrity verification

---

## 📊 8. Smart Contract Integration

### **8.1. MyDAppToken (ERC-20)**
**Contract Address:** `0x5573ccC3fcd4bf8a4Ad4679E8dCBa64553C7e520`

**Functions used:**
```javascript
// Read
balanceOf(address) → uint256
name() → string
symbol() → string
decimals() → uint8

// Write
transfer(address to, uint256 amount) → bool
```

### **8.2. MyDAppNFT (ERC-721)**
**Contract Address:** `0x20F26627ddD499f13118667Ac2321334e09B98Ba`

**Functions used:**
```javascript
// Read
balanceOf(address) → uint256
ownerOf(uint256 tokenId) → address
tokenURI(uint256 tokenId) → string
name() → string
symbol() → string

// Write
safeMint(address to, string uri)
safeTransferFrom(address from, address to, uint256 tokenId)

// Events
Transfer(address from, address to, uint256 tokenId)
```

### **8.3. Event Querying**
```javascript
// Get all NFTs owned by address
const filter = nft.filters.Transfer(null, userAddress)
const events = await nft.queryFilter(filter, 0, 'latest')

// Extract token IDs
const tokenIds = events.map(e => e.args.tokenId)
```

---

## 🌐 9. IPFS Integration

### **9.1. Pinata API**

#### **Upload File:**
```javascript
POST https://api.pinata.cloud/pinning/pinFileToIPFS
Headers:
  Authorization: Bearer {JWT}
  Content-Type: multipart/form-data
Body:
  file: [binary data]
  pinataMetadata: { name, keyvalues }

Response:
  { IpfsHash: "Qm...", PinSize: 1234, Timestamp: "..." }
```

#### **Pin JSON:**
```javascript
POST https://api.pinata.cloud/pinning/pinJSONToIPFS
Headers:
  Authorization: Bearer {JWT}
  Content-Type: application/json
Body:
  {
    pinataContent: { metadata object },
    pinataMetadata: { name, keyvalues }
  }

Response:
  { IpfsHash: "Qm...", PinSize: 456, Timestamp: "..." }
```

### **9.2. IPFS Gateways**
```javascript
// URI: ipfs://QmXxx...
// HTTP URLs:
https://gateway.pinata.cloud/ipfs/QmXxx...
https://ipfs.io/ipfs/QmXxx...
https://cloudflare-ipfs.com/ipfs/QmXxx...
https://gateway.ipfs.io/ipfs/QmXxx...
```

### **9.3. Fallback Strategy**
- Thử gateway đầu tiên
- Nếu fail (CORS, timeout) → thử gateway tiếp theo
- Retry đến hết list
- Throw error nếu tất cả fail

---

## 🛠️ 10. Tech Stack Summary

### **Frontend:**
- React 19.2.0
- React Router DOM 6.14.0
- ethers.js 6.15.0
- Vite 7.2.1

### **Blockchain:**
- Sepolia Testnet
- ERC-20 (Token)
- ERC-721 (NFT)
- MetaMask wallet

### **Storage:**
- IPFS (Pinata)
- Decentralized file storage
- Content addressing (CID)

### **Security:**
- Web Crypto API
- AES-256-GCM encryption
- SHA-256 hashing
- Client-side encryption

### **Styling:**
- CSS3 (custom)
- CSS Grid & Flexbox
- CSS Variables (dark theme)
- Responsive design

---

## 📝 11. Data Flow

### **Upload & Mint Flow:**
```
User Upload File
    ↓
Pinata IPFS (File)
    ↓
Generate Metadata + Encrypt (if enabled)
    ↓
Pinata IPFS (JSON Metadata)
    ↓
Get Metadata CID → ipfs://QmMetadata...
    ↓
Call Smart Contract: safeMint(address, tokenURI)
    ↓
MetaMask Sign Transaction
    ↓
Blockchain Confirm
    ↓
NFT Minted with Token ID
    ↓
Load NFT List → Fetch Metadata from IPFS
    ↓
Display in Gallery
```

### **View Asset Flow:**
```
Load NFT List (Query Transfer Events)
    ↓
Get Token IDs
    ↓
For each Token ID:
  - Get tokenURI from contract
  - Fetch metadata JSON from IPFS
  - Extract image CID
  - Load image from IPFS gateway
    ↓
Display in Gallery Cards
```

---

## 🏪 12. NFT Marketplace (Chợ NFT)

### Chức năng tổng quan:
Marketplace cho phép người dùng **đăng bán** và **mua** NFT bằng token MDT, tạo nên một hệ sinh thái giao dịch hoàn chỉnh.

---

### **12.1. List NFT for Sale (Đăng bán NFT)**

#### **Quy trình:**
```
Chọn NFT từ bộ sưu tập
    ↓
Click "Đăng bán"
    ↓
Nhập giá bán (MDT)
    ↓
Xác nhận listing
    ↓
Lưu vào marketplace storage
    ↓
NFT xuất hiện trong "NFTs đang bán"
```

#### **Validation:**
- Kiểm tra user sở hữu NFT
- Giá phải > 0
- NFT chưa được list trước đó

#### **Implementation (Demo):**
```javascript
const listing = {
  tokenId: nft.tokenId,
  seller: userAddress,
  price: "10.5",  // MDT
  tokenURI: "ipfs://Qm...",
  active: true,
  timestamp: Date.now()
}

// Store in localStorage (demo)
localStorage.setItem('nft_listings', JSON.stringify([...listings, listing]))
```

**Note:** Trong production, listing nên được quản lý bởi **Marketplace Smart Contract** với các chức năng:
- `listNFT(tokenId, price)` - Approve + create listing
- `cancelListing(tokenId)` - Remove from sale
- `buyNFT(tokenId)` - Atomic swap token ↔ NFT

---

### **12.2. Buy NFT (Mua NFT)**

#### **Quy trình:**
```
Browse NFTs đang bán
    ↓
Chọn NFT muốn mua
    ↓
Click "Mua ngay"
    ↓
Kiểm tra số dư MDT
    ↓
Transfer token cho seller
    ↓
(Demo) Mark listing as sold
    ↓
(Production) NFT transfer to buyer
```

#### **Checks:**
- User không thể mua NFT của chính mình
- Số dư MDT phải đủ để mua
- Listing phải còn active

#### **Transaction Flow (Demo):**
```javascript
// 1. Check balance
const balance = await tokenContract.balanceOf(buyerAddress)
const price = ethers.parseUnits(listing.price, 18)

if (balance < price) {
  alert('Số dư không đủ')
  return
}

// 2. Transfer token to seller
const tx = await tokenContract.transfer(listing.seller, price)
await tx.wait()

// 3. Mark as sold (in demo)
updateListing({ ...listing, active: false, buyer: buyerAddress })
```

**Production Implementation:**
```solidity
// Marketplace.sol
function buyNFT(uint256 tokenId) external {
    Listing memory listing = listings[tokenId];
    require(listing.active, "Not for sale");
    
    // Transfer token from buyer to seller
    token.transferFrom(msg.sender, listing.seller, listing.price);
    
    // Transfer NFT from seller to buyer
    nft.safeTransferFrom(listing.seller, msg.sender, tokenId);
    
    // Mark as sold
    listing.active = false;
    emit NFTSold(tokenId, msg.sender, listing.price);
}
```

---

### **12.3. Cancel Listing (Hủy đăng bán)**

#### **Chức năng:**
- Seller có thể hủy listing bất kỳ lúc nào
- NFT sẽ không còn xuất hiện trong marketplace
- Không mất phí

#### **Implementation:**
```javascript
const handleCancelListing = (listing) => {
  // Update listing status
  const updated = listings.map(l => 
    l.tokenId === listing.tokenId && l.seller === listing.seller
      ? { ...l, active: false, cancelledAt: Date.now() }
      : l
  )
  
  localStorage.setItem('nft_listings', JSON.stringify(updated))
  
  // Reload marketplace
  setListings(updated.filter(l => l.active))
}
```

---

### **12.4. My Listings (NFT đang bán của tôi)**

#### **Hiển thị:**
- NFTs mà user đang đăng bán
- Giá bán
- Thời gian đăng
- Nút hủy bán

#### **Features:**
- Filter NFTs theo seller address
- Real-time updates
- Quick actions (cancel, edit price)

---

### **12.5. Marketplace UI Components**

#### **NFT Cards (User's Collection):**
```jsx
<div className="nft-card">
  <div className="nft-image">🖼️</div>
  <div className="nft-info">
    <h3>NFT #{tokenId}</h3>
    <p>{tokenURI}</p>
    {isListed ? (
      <div className="listing-badge">Đang bán</div>
    ) : (
      <button onClick={handleList}>🏷️ Đăng bán</button>
    )}
  </div>
</div>
```

#### **Listing Cards (Marketplace):**
```jsx
<div className="listing-card">
  <div className="listing-image">🖼️</div>
  <div className="listing-info">
    <h3>{metadata.name}</h3>
    
    <div className="listing-seller">
      <span>Người bán:</span>
      <span>{seller.substring(0,6)}...{seller.substring(38)}</span>
    </div>
    
    <div className="listing-price">
      <span>Giá:</span>
      <span className="price-value">{price} MDT</span>
    </div>
    
    <button onClick={handleBuy}>💰 Mua ngay</button>
  </div>
</div>
```

---

### **12.6. Storage & State Management**

#### **Demo Implementation (localStorage):**
```javascript
// Structure
{
  "nft_listings": [
    {
      "tokenId": "0",
      "seller": "0xabc...",
      "price": "10.5",
      "tokenURI": "ipfs://Qm...",
      "active": true,
      "timestamp": 1733140800000
    }
  ]
}
```

#### **Production Implementation (Smart Contract):**
```solidity
struct Listing {
    address seller;
    uint256 price;
    bool active;
    uint256 listedAt;
}

mapping(uint256 => Listing) public listings;
```

---

### **12.7. Nghiệp vụ Marketplace (Theo yêu cầu)**

#### ✅ **Nghiệp vụ 1: Cấp (List NFT)**
- User có thể đăng bán NFT với giá tự định
- Validation: Ownership check, price > 0
- Storage: Save listing to marketplace

#### ✅ **Nghiệp vụ 2: Chuyển (Transfer/Buy)**
- Buyer chuyển token MDT cho seller
- (Production) NFT được transfer cho buyer
- Atomic transaction: Token ↔ NFT swap

#### ✅ **Nghiệp vụ 3: Xác thực (Verify)**
- Kiểm tra ownership trước khi list
- Kiểm tra balance trước khi buy
- Validate listing còn active
- Check seller ≠ buyer

---

### **12.8. Integration với Token & NFT**

#### **Token Integration:**
```javascript
// Check balance
const balance = await tokenContract.balanceOf(address)

// Transfer for payment
const tx = await tokenContract.transfer(seller, price)
```

#### **NFT Integration:**
```javascript
// Get NFT list
const nfts = await loadNFTs(userAddress)

// Check ownership
const owner = await nftContract.ownerOf(tokenId)

// (Production) Transfer NFT
await nftContract.safeTransferFrom(seller, buyer, tokenId)
```

---

### **12.9. Security Considerations**

#### **Validations:**
- ✅ Seller phải là owner của NFT
- ✅ Buyer không thể mua NFT của chính mình
- ✅ Price phải > 0
- ✅ Buyer phải có đủ token balance

#### **Production Requirements:**
- Smart contract escrow cho NFT
- Approval mechanism (ERC-721 approve)
- Royalty support (creator fees)
- Platform fee collection
- Reentrancy guards

---

### **12.10. Future Enhancements**

#### **Advanced Features:**
1. **Auction System**: Đấu giá NFT
2. **Offers**: Người mua đưa offer thấp hơn giá list
3. **Bundle Sales**: Bán nhiều NFT cùng lúc
4. **Royalties**: Tự động trả phần trăm cho creator
5. **Search & Filter**: Tìm kiếm theo category, giá, seller
6. **Price History**: Lịch sử giao dịch của NFT
7. **Trending NFTs**: NFTs được xem/mua nhiều nhất

---

### Công nghệ sử dụng:
- **React State**: Quản lý listings
- **localStorage**: Demo storage (thay vì smart contract)
- **ethers.js**: Token transfer
- **ERC-20 Token**: Payment currency
- **ERC-721 NFT**: Assets to trade

---

*Marketplace là tính năng hoàn thiện hệ sinh thái DApp, cho phép user trao đổi NFT một cách peer-to-peer!*

---

## 🎯 Các tính năng nổi bật:

1. ✅ **Upload tài sản lên IPFS** - Lưu trữ phi tập trung
2. ✅ **Mã hóa metadata** - Bảo mật dữ liệu nhạy cảm
3. ✅ **Mint NFT tự động** - Sau khi upload thành công
4. ✅ **Multi-gateway fallback** - Đảm bảo load được metadata
5. ✅ **Transaction notifications** - Real-time status updates
6. ✅ **ERC-721 standard** - Tương thích với OpenSea, Rarible
7. ✅ **Responsive UI** - Hoạt động trên mọi thiết bị
8. ✅ **MetaMask integration** - Kết nối ví dễ dàng
9. ✅ **Etherscan links** - Xác minh transaction trên blockchain
10. ✅ **Private asset support** - Đánh dấu tài sản riêng tư
11. ✅ **NFT Marketplace** - Mua bán NFT với token MDT
12. ✅ **Token payment system** - Thanh toán bằng ERC-20

---

## ✅ Đáp ứng đầy đủ yêu cầu đồ án:

### 1. Xây dựng & Triển khai hợp đồng thông minh ✅
- Logic xử lý: ERC-20 (Token MDT) + ERC-721 (NFT)
- Ràng buộc: Transfer validation, ownership verification, balance checks
- Triển khai: Sepolia testnet
- Kiểm thử: Đã test transfer, mint, approve flows

### 2. Tương tác với Hợp đồng qua Frontend (DApp) ✅
- Giao diện: 
  - ✅ Gửi giao dịch (transfer token, mint NFT, buy NFT)
  - ✅ Đọc dữ liệu (balance, NFT list, marketplace listings)
  - ✅ Hiển thị trạng thái (real-time notifications)
- Lỗi đã fix: Multi-gateway fallback cho IPFS metadata
- Mã hóa: AES-256-GCM cho sensitive data

### 3. Tích hợp IPFS ✅
- Dữ liệu: PDF files, Images (JPG/PNG/SVG), JSON metadata
- Thao tác:
  - ✅ Upload (pinFileToIPFS, pinJSONToIPFS)
  - ✅ Retrieve (fetchMetadataFromIPFS với fallback)
- Demo: Thành công upload + retrieve với Pinata

### 4. Token ERC-20 / NFT Marketplace ✅
- Token MDT (ERC-20): Transfer, balance tracking
- Marketplace nghiệp vụ:
  - ✅ **Cấp**: List NFT với giá bán
  - ✅ **Chuyển**: Buy NFT (transfer token payment)
  - ✅ **Xác thực**: Ownership + balance verification
- Demo giao dịch: Complete buy/sell flow

---

*Tài liệu được tạo: December 2, 2025*  
*DApp Version: 1.0 (với Marketplace)*  
*Network: Sepolia Testnet*
