import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Tạo __dirname trong ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hàm load JSON artifact từ file
function loadArtifact(fileName) {
  const filePath = path.join(__dirname, "..", fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

// Đọc 2 file JSON teammate gửi (đặt ở thư mục gốc project)
const tokenArtifact = loadArtifact("MyDAppToken.json");
const nftArtifact = loadArtifact("MyDAppNFT.json");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", balance.toString());

  // Deploy ERC-20 từ JSON
  const TokenFactory = new hre.ethers.ContractFactory(
    tokenArtifact.abi,
    tokenArtifact.bytecode,
    deployer
  );
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("MyDAppToken (MDT) deployed to:", tokenAddress);

  // Deploy ERC-721 từ JSON
  const NftFactory = new hre.ethers.ContractFactory(
    nftArtifact.abi,
    nftArtifact.bytecode,
    deployer
  );
  const nft = await NftFactory.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("MyDAppNFT (MDN) deployed to:", nftAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
