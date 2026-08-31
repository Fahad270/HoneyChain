// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * HoneyChainRegistry — Remix IDE
 *
 * 1. Open https://remix.ethereum.org
 * 2. Paste this file, compile with 0.8.20+
 * 3. Deploy (Injected Provider / Remix VM)
 * 4. Copy `registryKey()` from the deployed contract into backend/.env:
 *      CHAIN_REGISTRY_KEY=<hex without 0x or with 0x>
 *
 * registryKey is the project key. Pinata CIDs are anchored here.
 * QR on the jar = publicKey (bytes32). Bill code = one-time private key
 * whose keccak256 is stored as purchaseCommit — QR alone cannot prove a sale.
 */

contract HoneyChainRegistry {
    address public owner;
    bytes32 public registryKey;

    struct Batch {
        bytes32 publicKey;
        string ipfsCid;
        bytes32 prevHash;
        string stage;
        string jarSerial;
        bool exists;
        bool sold;
        bytes32 purchaseCommit;
        uint256 verifyCount;
        uint256 anchoredAt;
    }

    mapping(bytes32 => Batch) public batches;
    mapping(string => bytes32) public serialToPublicKey;
    mapping(bytes32 => bool) public usedCommits;

    event RegistryKeyIssued(bytes32 indexed key, address indexed deployer);
    event Anchored(bytes32 indexed publicKey, string cid, string stage, string jarSerial);
    event PurchaseIssued(bytes32 indexed publicKey, bytes32 commit, string billNo);
    event DualVerified(bytes32 indexed publicKey, bool ok, string reason, uint256 verifyCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        registryKey = keccak256(
            abi.encodePacked(block.timestamp, msg.sender, block.prevrandao, address(this))
        );
        emit RegistryKeyIssued(registryKey, msg.sender);
    }

    function anchor(
        bytes32 publicKey,
        string calldata ipfsCid,
        bytes32 prevHash,
        string calldata stage,
        string calldata jarSerial
    ) external onlyOwner {
        require(publicKey != bytes32(0), "empty key");
        require(bytes(ipfsCid).length > 0, "empty cid");
        Batch storage b = batches[publicKey];
        require(!b.exists, "already anchored");
        if (bytes(jarSerial).length > 0) {
            require(serialToPublicKey[jarSerial] == bytes32(0), "duplicate jar serial");
            serialToPublicKey[jarSerial] = publicKey;
        }
        batches[publicKey] = Batch({
            publicKey: publicKey,
            ipfsCid: ipfsCid,
            prevHash: prevHash,
            stage: stage,
            jarSerial: jarSerial,
            exists: true,
            sold: false,
            purchaseCommit: bytes32(0),
            verifyCount: 0,
            anchoredAt: block.timestamp
        });
        emit Anchored(publicKey, ipfsCid, stage, jarSerial);
    }

    function issuePurchase(bytes32 publicKey, bytes32 commit, string calldata billNo) external onlyOwner {
        Batch storage b = batches[publicKey];
        require(b.exists, "unknown jar");
        require(!b.sold, "already sold");
        require(commit != bytes32(0), "empty commit");
        require(!usedCommits[commit], "commit reused");
        b.sold = true;
        b.purchaseCommit = commit;
        usedCommits[commit] = true;
        emit PurchaseIssued(publicKey, commit, billNo);
    }

    /// Dual-key verify: publicKey from QR + keccak256(privateKey) from bill.
    function verify(bytes32 publicKey, bytes32 commit) external returns (bool ok, string memory reason) {
        Batch storage b = batches[publicKey];
        if (!b.exists) return _emitVerify(publicKey, false, "unknown public key");
        if (!b.sold) return _emitVerify(publicKey, false, "not sold — bill code not issued");
        if (b.purchaseCommit != commit) return _emitVerify(publicKey, false, "private key mismatch");
        b.verifyCount += 1;
        if (b.verifyCount > 1) {
            return _emitVerify(publicKey, false, "duplicate claim — this jar was already verified");
        }
        return _emitVerify(publicKey, true, "authentic first claim");
    }

    function _emitVerify(bytes32 publicKey, bool ok, string memory reason) internal returns (bool, string memory) {
        emit DualVerified(publicKey, ok, reason, batches[publicKey].verifyCount);
        return (ok, reason);
    }
}
