# 🚀 Quick Start - Asset Management Module

## Bước 1: Cấu hình Pinata

1. Tạo tài khoản miễn phí tại: https://app.pinata.cloud/
2. Vào **Developers → API Keys**
3. Tạo API key mới với quyền: `pinFileToIPFS`, `pinJSONToIPFS`
4. Copy JWT token

## Bước 2: Setup environment

```bash
cd frontend

# Copy .env template
cp .env.example .env

# Mở .env và paste JWT
nano .env
```

Thêm vào file `.env`:
```
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb...
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
```

## Bước 3: Chạy ứng dụng

```bash
# Install (nếu chưa)
npm install

# Dev server
npm run dev
```

Mở: http://localhost:5173

## Bước 4: Test đầy đủ

### 4.1. Kết nối ví
1. Click "Kết nối MetaMask"
2. Chọn tài khoản
3. Đảm bảo đang ở mạng **Sepolia**

### 4.2. Upload & Mint tài sản
1. Vào tab **"Quản lý Tài sản"**
2. Click **"Đăng ký tài sản mới"**
3. Upload file (PDF hoặc ảnh)
4. Điền metadata:
   - Tên: "Hợp đồng mua bán nhà"
   - Mô tả: "Hợp đồng chính thức..."
   - Loại: Hợp đồng
   - Giá trị: 5,000,000,000 VND
   - Tags: quan trọng, pháp lý
5. Chọn bảo mật:
   - **Không mã hóa**: Public data
   - **Hash**: Verify-only (khuyến nghị cho audit)
   - **Mã hóa AES-256**: Private data (lưu encryption key!)
6. Click **"Upload & Mint NFT"**
7. Đợi upload lên IPFS (10-30s)
8. Xác nhận giao dịch trong MetaMask
9. Đợi tx confirmed (~15s trên Sepolia)
10. NFT xuất hiện trong gallery! 🎉

### 4.3. Xem chi tiết
1. Click vào NFT card
2. Xem metadata đầy đủ
3. Download file từ IPFS
4. Click "Xem trên Etherscan" để verify on-chain

### 4.4. Chuyển nhượng
1. Click nút **"Chuyển nhượng"** trên NFT card
2. Nhập địa chỉ người nhận (0x...)
3. ⚠️ Nếu có mã hóa: Lưu ý chia sẻ encryption key!
4. Click **"Xác nhận chuyển nhượng"**
5. Confirm trong MetaMask
6. Đợi tx confirmed
7. NFT sẽ mất khỏi gallery của bạn

## 🧪 Test Cases

### TC1: Upload image
- File: `test-image.jpg` (< 5MB)
- Kết quả: Preview hiển thị, upload thành công

### TC2: Upload PDF
- File: `contract.pdf` (< 10MB)
- Kết quả: Icon PDF, metadata có `docs` field

### TC3: Multiple files
- Files: 1 ảnh + 2 PDFs
- Kết quả: Ảnh làm thumbnail, tất cả files trong metadata.files

### TC4: Security - Hash
- Chọn "Hash" mode
- Kết quả: metadata có `sensitiveHash` field

### TC5: Security - Encrypt
- Chọn "Mã hóa AES-256"
- Kết quả: 
  - Description hiển thị `[ENCRYPTED]`
  - Console log encryption key
  - metadata có `_encrypted` info

### TC6: Error - File quá lớn
- Upload file > 20MB
- Kết quả: Alert error, không upload

### TC7: Error - Wrong file type
- Upload .docx hoặc .exe
- Kết quả: Alert "Loại file không được hỗ trợ"

### TC8: Mint without Pinata JWT
- Không config .env
- Kết quả: Error "Pinata chưa được cấu hình"

## 📊 Expected Results

### Successful upload
```
✓ Upload files lên IPFS
✓ Tạo metadata
✓ Pin metadata lên IPFS
✓ Chuẩn bị mint NFT...

Metadata CID: QmXXXXXXXXXXXXXXXXXXXX
Token URI: ipfs://QmXXXXXXXXXXXXXXXXXXXX
Files uploaded: 3
```

### Successful mint
```javascript
// Transaction
{
  hash: "0xabcd1234...",
  from: "0x742d35...",
  to: "0x20F266..." (NFT contract),
  status: 1 (success)
}

// NFT appears in gallery
{
  tokenId: "5",
  tokenURI: "ipfs://QmXXX...",
  owner: "0x742d35..."
}
```

### Metadata structure
```json
{
  "name": "Hợp đồng mua bán nhà",
  "description": "Hợp đồng chính thức mua bán...",
  "image": "ipfs://QmYYY...",
  "docs": ["ipfs://QmZZZ..."],
  "files": [
    {
      "name": "contract.pdf",
      "uri": "ipfs://QmZZZ...",
      "mimeType": "application/pdf",
      "size": 245678
    }
  ],
  "attributes": [
    { "trait_type": "Loại tài sản", "value": "Hợp đồng" },
    { "trait_type": "Giá trị ước tính", "value": "5,000,000,000 VND" },
    { "trait_type": "Tag", "value": "quan trọng" },
    { "trait_type": "Tag", "value": "pháp lý" }
  ],
  "createdBy": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bFd8",
  "createdAt": 1701475234
}
```

## 🔍 Verify on Etherscan

1. Copy transaction hash từ notification
2. Mở: https://sepolia.etherscan.io/tx/[HASH]
3. Check:
   - ✅ Status: Success
   - ✅ To: NFT contract address
   - ✅ Function: safeMint(address,string)
   - ✅ Input Data: tokenURI visible
4. Click vào NFT contract
5. Tab "Read Contract" → tokenURI(tokenId) → Paste vào browser
6. Verify metadata JSON hiển thị đúng

## 🐛 Troubleshooting

### Error: "Pinata chưa được cấu hình"
**Fix:** Thêm `VITE_PINATA_JWT` vào file `.env`

### Error: "Failed to fetch metadata"
**Fix:** 
- Check IPFS gateway có hoạt động: https://gateway.pinata.cloud/ipfs/QmXXX...
- Thử gateway khác: https://ipfs.io/ipfs/QmXXX...
- Đợi vài phút (pinning có thể chậm)

### Error: "Transaction reverted"
**Fix:**
- Check gas: Có đủ ETH Sepolia không?
- Check network: Đang ở Sepolia?
- Check contract: Có bị pause không?

### Upload chậm
**Nguyên nhân:** File lớn, mạng chậm, Pinata rate limit
**Fix:** 
- Giảm kích thước file
- Đợi vài phút retry
- Upgrade Pinata plan nếu cần

### Metadata không load
**Fix:**
- Hard refresh (Ctrl+Shift+R)
- Check console logs
- Verify CID trên Etherscan và IPFS gateway

## 📈 Performance Tips

1. **Compress ảnh** trước khi upload (dùng TinyPNG, Squoosh)
2. **Batch upload** nhiều tài sản → Mint sau
3. **CDN**: Setup custom IPFS gateway với CDN
4. **Cache**: LocalStorage cache metadata đã fetch
5. **Lazy load**: Chỉ load metadata khi user scroll đến

## 🔐 Security Reminders

- ✅ **Private key**: Không bao giờ nhập vào website
- ✅ **Encryption key**: Lưu offline, backup multiple locations
- ✅ **Sensitive data**: Luôn chọn Hash hoặc Encrypt
- ✅ **Transfer NFT**: Nhớ chia sẻ key với recipient qua Signal/PGP
- ⚠️ **Public IPFS**: Ai cũng có thể access nếu biết CID

## ✅ Acceptance Criteria Verification

| Criteria | Status | How to verify |
|----------|--------|---------------|
| Upload PDF/JPG/PNG → IPFS | ✅ | Console log CID, check gateway URL |
| Metadata JSON pin | ✅ | Open ipfs://CID in browser |
| Mint NFT với tokenURI | ✅ | Check Etherscan tx, read tokenURI |
| NFT trong gallery | ✅ | Refresh page, see card |
| Transfer NFT | ✅ | Recipient address sees NFT |
| Encrypt sensitive | ✅ | Metadata has [ENCRYPTED], key exported |
| Tx status với Etherscan | ✅ | Notifications show link |
| Logging | ✅ | Console.log upload/mint/transfer |

## 🎓 Next Steps

1. **Production deployment**: 
   - Setup backend cho API key security
   - CDN cho IPFS gateway
   - Database backup CIDs

2. **Advanced features**:
   - Bulk operations
   - Metadata versioning
   - Role-based access control

3. **Mobile app**:
   - React Native with same contracts
   - QR code scanning

---

**Demo video:** [Link if available]
**Live demo:** http://localhost:5173/assets

**Happy minting! 🚀🎨**
