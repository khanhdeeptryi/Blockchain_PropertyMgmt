// src/constants.js
import tokenArtifact from "./contracts/MyDAppToken.json";
import nftArtifact from "./contracts/MyDAppNFT.json";

// Địa chỉ contract trên Sepolia (đã deploy)
export const TOKEN_ADDRESS = "0x5573ccC3fcd4bf8a4Ad4679E8dCBa64553C7e520";
export const NFT_ADDRESS   = "0x20F26627ddD499f13118667Ac2321334e09B98Ba";

// ABI
export const TOKEN_ABI = tokenArtifact.abi;
export const NFT_ABI   = nftArtifact.abi;
