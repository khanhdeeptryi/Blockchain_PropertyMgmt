# Module Quản lý Tài sản Mã hóa - Asset Management

## 📋 Tổng quan

Module này cung cấp giải pháp hoàn chỉnh để upload, mint, quản lý và chuyển nhượng tài sản kỹ thuật số dưới dạng NFT trên blockchain Ethereum (Sepolia testnet). Tài sản có thể là PDF, hình ảnh (JPG, PNG, SVG) với metadata được lưu trữ phân tán trên IPFS.

## ✨ Tính năng chính

### 1. Upload & Pin lên IPFS
- ✅ Upload nhiều files (PDF, JPG, PNG, SVG) cùng lúc
- ✅ Validation: Loại file, kích thước (max 20MB)
- ✅ Preview ảnh trước khi upload
- ✅ Pin files + metadata JSON lên Pinata IPFS
- ✅ Progress bar real-time
- ✅ Retry mechanism khi lỗi

### 2. Metadata chuẩn ERC-721
```json
{
  "name": "Tên tài sản",
  "description": "Mô tả chi tiết",
  "image": "ipfs://<CID>",
  "docs": ["ipfs://<CID-file1>", "ipfs://<CID-file2>"],
  "files": [
    {
      "name": "document.pdf",
      "uri": "ipfs://<CID>",
      "mimeType": "application/pdf",
      "size": 123456
    }
  ],
  "attributes": [
    { "trait_type": "Loại tài sản", "value": "Hợp đồng" },
    { "trait_type": "Giá trị ước tính", "value": "10,000,000 VND" }
  ],
  "createdBy": "0x...",
  "createdAt": 1701475200
}
```

### 3. Bảo mật dữ liệu nhạy cảm

#### Option A: Hash (Verify-only)
- Hash SHA-256 các trường nhạy cảm
- Lưu hash trong metadata để xác minh
- Không thể khôi phục dữ liệu gốc

#### Option B: Encryption (AES-256-GCM)
- Mã hóa client-side với Web Crypto API
- Lưu ciphertext lên IPFS
- Export encryption key (base64) để chia sẻ
- Chỉ người có key mới giải mã được

**⚠️ Quan trọng:** 
- Private keys không bao giờ lưu trên server
- Encryption key phải được lưu trữ an toàn off-chain
- Khi chuyển nhượng NFT có dữ liệu mã hóa, cần chia sẻ key với người nhận qua kênh bảo mật

### 4. Mint NFT
- ✅ Tự động gọi `safeMint(to, tokenURI)` qua MetaMask
- ✅ tokenURI = `ipfs://<metadata-CID>`
- ✅ Emit event `AssetRegistered` (nếu contract hỗ trợ)
- ✅ Hiển thị transaction hash + Etherscan link
- ✅ Auto-refresh gallery sau khi mint thành công

### 5. Gallery & Quản lý
- ✅ Grid layout responsive hiển thị tất cả NFT của user
- ✅ Hiển thị: Thumbnail, tên, mô tả, attributes, số files
- ✅ Click card để xem chi tiết đầy đủ
- ✅ Download files từ IPFS gateway
- ✅ Link Etherscan cho mỗi NFT

### 6. Chuyển nhượng (Transfer)
- ✅ Form nhập địa chỉ người nhận
- ✅ Gọi `transferFrom(owner, to, tokenId)` qua MetaMask
- ✅ Cảnh báo nếu tài sản có dữ liệu mã hóa → nhắc chia sẻ key
- ✅ Update gallery tự động sau transfer

## 🏗️ Kiến trúc

```
frontend/src/
├── utils/
│   ├── ipfsService.js       # Pinata integration (upload, pin, fetch)
│   └── encryption.js         # AES-256-GCM encryption/decryption
├── components/
│   ├── AssetUpload.jsx       # Upload modal với form & progress
│   └── TransactionStatus.jsx # Real-time tx notifications
├── pages/
│   └── AssetManagement.jsx   # Gallery, detail modal, transfer modal
└── App.jsx                   # Routes & contract calls
```

### Flow diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Select files + metadata
       ▼
┌────────────────────────┐
│  AssetUpload.jsx       │
│  - Validate files      │
│  - Preview images      │
│  - Security options    │
└──────┬─────────────────┘
       │ 2. Upload files
       ▼
┌────────────────────────┐
│  ipfsService.js        │
│  - uploadFileToIPFS()  │
│  - pinJSONToIPFS()     │
└──────┬─────────────────┘
       │ 3. Get IPFS URIs
       ▼
┌────────────────────────┐
│  encryption.js         │ (optional)
│  - encryptData()       │
│  - hashData()          │
└──────┬─────────────────┘
       │ 4. Metadata ready
       ▼
┌────────────────────────┐
│  App.jsx               │
│  - handleMintAsset()   │
│  - Call safeMint()     │
└──────┬─────────────────┘
       │ 5. Tx confirmed
       ▼
┌────────────────────────┐
│  AssetManagement.jsx   │
│  - Refresh gallery     │
│  - Show new NFT        │
└────────────────────────┘
```

## 🔐 Bảo mật

### Client-side encryption
```javascript
import { createEncryptedMetadata } from './utils/encryption';

const sensitiveFields = ['description', 'value'];
const { metadata, encryptedFields, key } = await createEncryptedMetadata(
  originalMetadata,
  sensitiveFields
);

// metadata = public với [ENCRYPTED] placeholder
// key = base64 string - LƯU GIỮ CẨN THẬN!
console.log('🔑 Encryption key:', key);
```

### Hash verification
```javascript
import { hashData } from './utils/encryption';

const hash = await hashData(sensitiveData);
metadata.sensitiveHash = hash;
// Sau này verify bằng cách hash lại và so sánh
```

### Best practices
1. **Không lưu private key** trên server hay trong code
2. **Encryption key management**: 
   - Option 1: User tự lưu (export to file)
   - Option 2: Server KMS (nếu có backend trusted)
   - Option 3: Asymmetric encryption với public key của recipient
3. **Chia sẻ key khi transfer**:
   - Encrypt key với public key của recipient
   - Gửi qua kênh off-chain (email encrypted, Signal, etc.)
4. **Audit trail**: Log mọi upload/mint/transfer với timestamp

## 📡 API / IPFS Service

### Environment setup
```bash
# Copy example
cp frontend/.env.example frontend/.env

# Add your Pinata JWT
# Get from: https://app.pinata.cloud/developers/api-keys
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ipfsService.js functions

```javascript
// Upload file
const { ipfsCid, ipfsUri, size, mimeType } = await uploadFileToIPFS(
  file,
  (progress) => console.log(`${progress}%`)
);

// Pin JSON metadata
const { metadataCid, metadataUri } = await pinJSONToIPFS(
  metadata,
  'asset-name'
);

// Fetch metadata
const metadata = await fetchMetadataFromIPFS('ipfs://QmXxx...');

// Convert to HTTP
const httpUrl = ipfsToHttp('ipfs://QmXxx...');
// => https://gateway.pinata.cloud/ipfs/QmXxx...

// Validate file
const { valid, error } = validateFile(file, 20); // 20MB max
```

## 🧪 Testing checklist

### ✅ Acceptance Criteria

- [x] **AC1**: Upload PDF/JPG/PNG → Pin lên IPFS → Trả về `ipfs://` URI
- [x] **AC2**: Metadata JSON chuẩn ERC-721 được tạo và pin lên IPFS
- [x] **AC3**: User mint NFT với tokenURI = metadata IPFS URI qua MetaMask trên Sepolia
- [x] **AC4**: NFT xuất hiện trong gallery với image/metadata hiển thị đúng
- [x] **AC5**: User transfer NFT → Recipient có thể xem metadata và tải file (nếu không mã hóa)
- [x] **AC6**: Nếu chọn encrypt: metadata mã hóa trước upload, không có dữ liệu nhạy cảm công khai
- [x] **AC7**: UI hiển thị trạng thái tx (pending/success/fail) với Etherscan link
- [x] **AC8**: Có logging upload, pin, mint tx hash để audit

### Manual testing

```bash
# 1. Start dev server
cd frontend
npm run dev

# 2. Test flow:
# - Kết nối MetaMask với Sepolia
# - Vào "Quản lý Tài sản"
# - Click "Đăng ký tài sản mới"
# - Upload PDF/ảnh, điền metadata
# - Chọn security mode: none/hash/encrypt
# - Click "Upload & Mint NFT"
# - Xác nhận MetaMask
# - Verify tokenURI trên Etherscan
# - Download file via IPFS gateway
# - Test transfer sang địa chỉ khác
# - Verify recipient thấy metadata
```

### Error scenarios

| Scenario | Expected behavior |
|----------|------------------|
| File quá lớn (>20MB) | Validation error, không upload |
| File không đúng định dạng | Alert error message |
| Pinata JWT không config | Error "Pinata chưa được cấu hình" |
| IPFS pin failed | Retry prompt, show error |
| Mint tx rejected | Rollback UI state, show error |
| Mint tx success but pin failed | Show "Retry mint" với same URI |
| User cancel MetaMask | Rollback, no tx sent |

## 📊 Monitoring & Logging

### Console logs
```javascript
// Upload
console.log('Uploading file:', file.name);
console.log('IPFS CID:', ipfsCid);

// Encrypt
console.log('Encryption key:', key); // ⚠️ SENSITIVE

// Mint
console.log('Mint tx hash:', tx.hash);
console.log('Token URI:', tokenURI);

// Transfer
console.log('Transfer tx hash:', tx.hash);
console.log('From:', owner, 'To:', recipient);
```

### Transaction notifications
- Pending: "Đang gửi giao dịch..."
- Success: "Mint tài sản thành công!" + Etherscan link
- Error: "Lỗi: [error message]"

## 🚀 Deployment

### Production checklist
- [ ] Pinata JWT trong environment variables (không commit vào git)
- [ ] IPFS gateway sử dụng custom domain (optional, tốc độ tốt hơn)
- [ ] Rate limiting cho Pinata API
- [ ] Backup CIDs vào database (nếu có backend)
- [ ] Smart contract verified trên Etherscan
- [ ] Frontend build optimization: code splitting, lazy load
- [ ] Error tracking: Sentry/LogRocket

### Backend option (khuyến nghị production)

```javascript
// Node.js/Express backend
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const pinataResult = await pinFileToIPFS(req.file);
  await db.saveCID(req.user.id, pinataResult.IpfsHash);
  res.json({ ipfsCid: pinataResult.IpfsHash });
});

// Pros: API key bảo mật, rate limiting, logging centralized
```

## 📚 Dependencies

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-router-dom": "^6.14.2",
    "ethers": "^6.15.0"
  }
}
```

**No external IPFS libraries needed** - Sử dụng trực tiếp Pinata REST API.

## 🔗 Resources

- [Pinata Docs](https://docs.pinata.cloud/)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
- [ERC-721 Metadata Standard](https://eips.ethereum.org/EIPS/eip-721)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## 💡 Future enhancements

- [ ] Bulk upload (nhiều tài sản cùng lúc)
- [ ] IPFS pinning status check
- [ ] Metadata versioning (update metadata on-chain)
- [ ] NFT approval management (approve, revoke)
- [ ] Transaction history with filters
- [ ] Export encryption keys to encrypted file
- [ ] QR code for asset sharing
- [ ] Mobile responsive optimizations
- [ ] Dark/light theme toggle

---

## 📞 Support

Nếu gặp vấn đề:
1. Check console logs
2. Verify Pinata JWT is valid
3. Ensure MetaMask on Sepolia network
4. Check transaction on Etherscan
5. Verify IPFS gateway accessibility

**Hotline issues:**
- IPFS upload slow → Use faster gateway or CDN
- Metadata not loading → Check CORS, gateway status
- Mint failed → Check gas, contract permissions
- Encryption key lost → Cannot recover (by design)
