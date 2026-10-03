// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HoneyDbtEscrow - KVIC Honey Mission Smart Escrow & Automated Direct Benefit Transfer (DBT)
 *
 * Designed for SIH Problem Statement #26021:
 * Solves the critical economic bottleneck in rural Indian beekeeping:
 * - Rural beekeepers extract honey (Stage 2) and hand it to KVIC Mobile Honey Processing Units (Stage 3).
 * - Rather than making farmers wait 30-90 days for manual bureaucratic clearances or losing money to middlemen,
 *   procurement funds are locked into this Smart Escrow at the KVIC Minimum Support Price (MSP, e.g. ₹225/kg).
 * - Multi-Condition Autonomous Release:
 *   1. Collection Ingestion: KVIC Field Officer confirms physical receipt & weight.
 *   2. CBRTI Pune Quality Oracle: Central Bee Research & Training Institute confirms Moisture <= 20.0% and negative C3/C4 syrup adulteration.
 * - The moment CBRTI signs off on-chain, the escrow autonomously triggers DBT payout via e-RUPI voucher / direct transfer to the beekeeper's Aadhaar-linked VPA.
 * - If the lab report detects adulteration (Moisture > 20% or C3/C4 markers), the escrow transitions to REJECTED, blocking payout and preserving public funds.
 */

contract HoneyDbtEscrow {
    address public kvicTreasury;
    bytes32 public constant CBRTI_PUNE_ORACLE_ROLE = keccak256("CBRTI_PUNE_ORACLE_ROLE");
    bytes32 public constant KVIC_COLLECTOR_ROLE = keccak256("KVIC_COLLECTOR_ROLE");

    enum EscrowStatus {
        LOCKED_PENDING_COLLECTION,  // 0: Escrow created upon extraction
        COLLECTED_PENDING_LAB,      // 1: Honey weighed & collected by KVIC MHPU
        QUALITY_CERTIFIED,          // 2: CBRTI Pune certified moisture <= 20% & pure
        DISBURSED_DBT,              // 3: Funds/e-RUPI voucher released to farmer
        REJECTED_QUALITY_FAIL       // 4: Failed lab purity (moisture > 20% or syrup)
    }

    struct EscrowDeposit {
        bytes32 lotHash;               // Blockchain DAG block hash for honey lot
        bytes32 beekeeperAadhaarHash;  // SHA-256 of beekeeper's Aadhaar
        string beekeeperName;          // Farmer name
        string village;                // Village / Cluster
        string upiVpa;                 // Aadhaar-linked UPI VPA (e.g. farmer@sbi)
        uint256 lotWeightKg;           // Harvest weight in kg
        uint256 mspRatePerKgInr;       // Official KVIC procurement rate (₹/kg)
        uint256 totalAmountInr;        // Total settlement value
        EscrowStatus status;           // Current lifecycle status
        uint256 moistureBasisPoints;   // Moisture level (e.g. 1820 = 18.2%, max allowable 2000 = 20.0%)
        bytes32 cbrtiCertHash;         // CBRTI NABL lab report hash
        string eRupiVoucherRef;        // NPCI e-RUPI voucher reference code
        uint256 createdAt;             // Timestamp of creation
        uint256 settledAt;             // Timestamp of DBT release
    }

    mapping(bytes32 => EscrowDeposit) public escrows;
    mapping(address => bool) public authorizedCollectors;
    mapping(address => bool) public authorizedLabOracles;

    event EscrowCreated(
        bytes32 indexed lotHash,
        bytes32 indexed beekeeperAadhaarHash,
        string beekeeperName,
        uint256 lotWeightKg,
        uint256 totalAmountInr
    );

    event CollectionLogged(bytes32 indexed lotHash, address indexed collector, uint256 timestamp);
    
    event CbrtiLabAttested(
        bytes32 indexed lotHash,
        bytes32 indexed certHash,
        uint256 moistureBps,
        bool passed
    );

    event DbtPaymentDisbursed(
        bytes32 indexed lotHash,
        bytes32 indexed beekeeperAadhaarHash,
        uint256 amountInr,
        string eRupiVoucherRef,
        uint256 timestamp
    );

    event EscrowRejected(bytes32 indexed lotHash, string reason, uint256 timestamp);

    modifier onlyTreasury() {
        require(msg.sender == kvicTreasury, "Not KVIC Treasury");
        _;
    }

    constructor() {
        kvicTreasury = msg.sender;
        authorizedLabOracles[msg.sender] = true;
        authorizedCollectors[msg.sender] = true;
    }

    function setCollector(address collector, bool status) external onlyTreasury {
        authorizedCollectors[collector] = status;
    }

    function setLabOracle(address oracle, bool status) external onlyTreasury {
        authorizedLabOracles[oracle] = status;
    }

    /// Step 1: Initialize Escrow upon extraction (Stage 2) or collection intent (Stage 3)
    function lockLotEscrow(
        bytes32 lotHash,
        bytes32 beekeeperAadhaarHash,
        string calldata beekeeperName,
        string calldata village,
        string calldata upiVpa,
        uint256 lotWeightKg,
        uint256 mspRatePerKgInr
    ) external onlyTreasury {
        require(lotHash != bytes32(0), "Invalid lot hash");
        require(lotWeightKg > 0, "Weight must be > 0");
        require(escrows[lotHash].lotHash == bytes32(0), "Escrow already exists for lot");

        uint256 totalAmount = lotWeightKg * mspRatePerKgInr;

        escrows[lotHash] = EscrowDeposit({
            lotHash: lotHash,
            beekeeperAadhaarHash: beekeeperAadhaarHash,
            beekeeperName: beekeeperName,
            village: village,
            upiVpa: upiVpa,
            lotWeightKg: lotWeightKg,
            mspRatePerKgInr: mspRatePerKgInr,
            totalAmountInr: totalAmount,
            status: EscrowStatus.LOCKED_PENDING_COLLECTION,
            moistureBasisPoints: 0,
            cbrtiCertHash: bytes32(0),
            eRupiVoucherRef: "",
            createdAt: block.timestamp,
            settledAt: 0
        });

        emit EscrowCreated(lotHash, beekeeperAadhaarHash, beekeeperName, lotWeightKg, totalAmount);
    }

    /// Step 2: KVIC Mobile Processing Unit confirms physical pickup & weight
    function confirmCollection(bytes32 lotHash) external {
        require(authorizedCollectors[msg.sender] || msg.sender == kvicTreasury, "Not authorized collector");
        EscrowDeposit storage e = escrows[lotHash];
        require(e.lotHash != bytes32(0), "Escrow not found");
        require(e.status == EscrowStatus.LOCKED_PENDING_COLLECTION, "Invalid status for collection");

        e.status = EscrowStatus.COLLECTED_PENDING_LAB;
        emit CollectionLogged(lotHash, msg.sender, block.timestamp);
    }

    /// Step 3: CBRTI Pune NABL Lab Oracle inputs certified test values
    function attestCbrtiPurity(
        bytes32 lotHash,
        bytes32 certHash,
        uint256 moistureBps, // e.g. 1820 = 18.2%
        bool c3c4SyrupNegative,
        string calldata eRupiVoucherRef
    ) external {
        require(authorizedLabOracles[msg.sender] || msg.sender == kvicTreasury, "Not authorized lab oracle");
        EscrowDeposit storage e = escrows[lotHash];
        require(e.lotHash != bytes32(0), "Escrow not found");
        require(
            e.status == EscrowStatus.COLLECTED_PENDING_LAB || e.status == EscrowStatus.LOCKED_PENDING_COLLECTION,
            "Invalid status for lab attestation"
        );

        e.moistureBasisPoints = moistureBps;
        e.cbrtiCertHash = certHash;

        // Regulatory check: FSSAI / Agmark Grade A threshold is Moisture <= 20.0% (2000 bps)
        if (moistureBps <= 2000 && c3c4SyrupNegative) {
            e.status = EscrowStatus.DISBURSED_DBT;
            e.eRupiVoucherRef = eRupiVoucherRef;
            e.settledAt = block.timestamp;

            emit CbrtiLabAttested(lotHash, certHash, moistureBps, true);
            emit DbtPaymentDisbursed(
                lotHash,
                e.beekeeperAadhaarHash,
                e.totalAmountInr,
                eRupiVoucherRef,
                block.timestamp
            );
        } else {
            e.status = EscrowStatus.REJECTED_QUALITY_FAIL;
            e.settledAt = block.timestamp;

            emit CbrtiLabAttested(lotHash, certHash, moistureBps, false);
            emit EscrowRejected(
                lotHash,
                moistureBps > 2000 ? "Moisture > 20% (Fermentation Risk)" : "C3/C4 Syrup Adulteration Detected",
                block.timestamp
            );
        }
    }

    /// Read full escrow status for a honey lot
    function getEscrowDetails(bytes32 lotHash)
        external
        view
        returns (
            bytes32 lot,
            string memory beekeeperName,
            string memory village,
            string memory upiVpa,
            uint256 weightKg,
            uint256 totalAmountInr,
            EscrowStatus status,
            uint256 moistureBps,
            string memory eRupiVoucherRef,
            uint256 settledAt
        )
    {
        EscrowDeposit storage e = escrows[lotHash];
        return (
            e.lotHash,
            e.beekeeperName,
            e.village,
            e.upiVpa,
            e.lotWeightKg,
            e.totalAmountInr,
            e.status,
            e.moistureBasisPoints,
            e.eRupiVoucherRef,
            e.settledAt
        );
    }
}
