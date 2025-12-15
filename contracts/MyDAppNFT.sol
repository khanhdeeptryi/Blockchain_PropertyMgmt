// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyDAppNFT
 * @dev ERC-721 NFT cho quản lý tài sản DApp TokProp
 */
contract MyDAppNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    /**
     * @dev Constructor khởi tạo NFT collection
     */
    constructor() ERC721("MyDAppNFT", "MDNFT") Ownable(msg.sender) {
        _nextTokenId = 0;
    }

    /**
     * @dev Mint NFT mới với metadata URI
     * @param to Địa chỉ nhận NFT
     * @param uri IPFS URI chứa metadata
     * @return tokenId của NFT được mint
     */
    function safeMint(address to, string memory uri) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Override tokenURI để hỗ trợ URIStorage
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override supportsInterface để hỗ trợ URIStorage
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
