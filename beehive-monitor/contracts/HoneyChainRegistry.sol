// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * HoneyChainRegistry — Remix IDE / EVM Settlement
 *
 * 1. Open https://remix.ethereum.org
 * 2. Paste this file, compile with 0.8.20+
 * 3. Deploy (Injected Provider / Polygon / Arbitrum / Besu)
 * 4. Copy `registryKey()` from deployed contract into backend/.env:
 *      CHAIN_REGISTRY_KEY=<hex without 0x or with 0x>
 *
 * Features:
 * - Public Key (bytes32): Anchored on jar QR code
 * - Purchase Commit (bytes32): keccak256(privateKey) issued at physical POS or ekhadiindia.com
 * - Multi-Channel: Supports "offline" (Khadi Bhavan receipt) and "online" (ekhadiindia.com order)
 * - CBRTI Pune Lab Attestation: Records certified purity hash on-chain
 * - Anti-Counterfeit Dual-Key Check: Rejects duplicate claims upon 2nd scan
 */

contract HoneyChainRegistry {
    address public owner;
    bytes32 public registryKey;

    struct Batch {
        bytes32 publicKey;        // SHA-256 of packaging block
        string ipfsCid;           // Immutable Pinata IPFS Content Identifier
        bytes32 prevHash;         // Previous block hash in DAG
        string stage;             // Stage name (e.g. "packaging", "lab_certified")
        string jarSerial;         // Unique Retail Jar Serial (e.g. "JAR-9A4B-3C2D")
        bytes32 cbrtiPurityHash;  // Hash of CBRTI Pune NABL lab report (moisture, C3/C4, pollen)
        string channel;           // "offline" (Khadi Bhavan) or "online" (ekhadiindia.com)
        bool exists;
        bool sold;
        bytes32 purchaseCommit;   // keccak256(privateKey) committed upon retail checkout/dispatch
        uint256 verifyCount;      // Number of times verified (flags duplicates)
        uint256 anchoredAt;       // Block timestamp
    }

    mapping(bytes32 => Batch) public batches;
    mapping(string => bytes32) public serialToPublicKey;
    mapping(bytes32 => bool) public usedCommits;

    event RegistryKeyIssued(bytes32 indexed key, address indexed deployer);
    event Anchored(bytes32 indexed publicKey, string cid, string stage, string jarSerial, bytes32 cbrtiPurityHash);
    event PurchaseIssued(bytes32 indexed publicKey, bytes32 commit, string referenceNo, string channel);
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

    /// Anchors IPFS CID, stage, and CBRTI lab hash onto the immutable ledger
    function anchor(
        bytes32 publicKey,
        string calldata ipfsCid,
        bytes32 prevHash,
        string calldata stage,
        string calldata jarSerial,
        bytes32 cbrtiPurityHash
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
            cbrtiPurityHash: cbrtiPurityHash,
            channel: "unassigned",
            exists: true,
            sold: false,
            purchaseCommit: bytes32(0),
            verifyCount: 0,
            anchoredAt: block.timestamp
        });
        emit Anchored(publicKey, ipfsCid, stage, jarSerial, cbrtiPurityHash);
    }

    /// Multi-channel dispatch/checkout: logs physical store bill or ekhadiindia.com order
    function issuePurchaseMultiChannel(
        bytes32 publicKey,
        bytes32 commit,
        string calldata referenceNo,
        string calldata channel
    ) external onlyOwner {
        Batch storage b = batches[publicKey];
        require(b.exists, "unknown jar");
        require(!b.sold, "already sold");
        require(commit != bytes32(0), "empty commit");
        require(!usedCommits[commit], "commit reused");
        b.sold = true;
        b.purchaseCommit = commit;
        b.channel = channel;
        usedCommits[commit] = true;
        emit PurchaseIssued(publicKey, commit, referenceNo, channel);
    }

    /// Backward-compatible purchase issuance
    function issuePurchase(bytes32 publicKey, bytes32 commit, string calldata billNo) external onlyOwner {
        Batch storage b = batches[publicKey];
        require(b.exists, "unknown jar");
        require(!b.sold, "already sold");
        require(commit != bytes32(0), "empty commit");
        require(!usedCommits[commit], "commit reused");
        b.sold = true;
        b.purchaseCommit = commit;
        b.channel = "offline";
        usedCommits[commit] = true;
        emit PurchaseIssued(publicKey, commit, billNo, "offline");
    }

    /// Dual-key verify: publicKey from QR + keccak256(privateKey) from bill/order
    function verify(bytes32 publicKey, bytes32 commit) external returns (bool ok, string memory reason) {
        Batch storage b = batches[publicKey];
        if (!b.exists) return _emitVerify(publicKey, false, "unknown public key");
        if (!b.sold) return _emitVerify(publicKey, false, "not sold - verification code not issued");
        if (b.purchaseCommit != commit) return _emitVerify(publicKey, false, "private key mismatch");
        b.verifyCount += 1;
        if (b.verifyCount > 1) {
            return _emitVerify(publicKey, false, "duplicate claim - this jar was already verified");
        }
        return _emitVerify(publicKey, true, "authentic first claim");
    }

    function _emitVerify(bytes32 publicKey, bool ok, string memory reason) internal returns (bool, string memory) {
        emit DualVerified(publicKey, ok, reason, batches[publicKey].verifyCount);
        return (ok, reason);
    }
}
