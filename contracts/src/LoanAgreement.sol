// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title LoanAgreement
 * @dev Smart contract for managing loan agreements on Provenance blockchain
 * @author Michigan Tokenizers
 */
contract LoanAgreement is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Loan structure
    struct Loan {
        uint256 id;
        address borrower;
        uint256 principalAmount;
        uint256 interestRate; // in basis points (100 = 1%)
        uint256 term; // in months
        uint256 monthlyPayment;
        uint256 totalAmount;
        uint256 remainingBalance;
        uint256 startDate;
        uint256 endDate;
        LoanStatus status;
        CollateralInfo collateral;
        bool isActive;
    }

    // Collateral information
    struct CollateralInfo {
        string assetType;
        uint256 value;
        string description;
        string provenanceHash; // Hash of asset provenance data
    }

    // Payment structure
    struct Payment {
        uint256 loanId;
        uint256 amount;
        uint256 principal;
        uint256 interest;
        uint256 fees;
        uint256 dueDate;
        PaymentStatus status;
        uint256 paidDate;
    }

    // Enums
    enum LoanStatus { Pending, Approved, Active, Completed, Defaulted, Cancelled }
    enum PaymentStatus { Pending, Paid, Overdue, Cancelled }

    // State variables
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => Payment[]) public payments;
    mapping(address => uint256[]) public borrowerLoans;
    
    uint256 public nextLoanId = 1;
    uint256 public totalLoans;
    uint256 public totalVolume;
    
    // Events
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanApproved(uint256 indexed loanId, address indexed borrower);
    event PaymentProcessed(uint256 indexed loanId, uint256 indexed paymentId, uint256 amount);
    event LoanCompleted(uint256 indexed loanId, address indexed borrower);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event CollateralRegistered(uint256 indexed loanId, string assetType, uint256 value);

    // Modifiers
    modifier onlyBorrower(uint256 _loanId) {
        require(loans[_loanId].borrower == msg.sender, "Only borrower can perform this action");
        _;
    }

    modifier loanExists(uint256 _loanId) {
        require(_loanId < nextLoanId && loans[_loanId].isActive, "Loan does not exist");
        _;
    }

    modifier validLoanStatus(uint256 _loanId, LoanStatus _status) {
        require(loans[_loanId].status == _status, "Invalid loan status for this operation");
        _;
    }

    /**
     * @dev Create a new loan agreement
     * @param _borrower Address of the borrower
     * @param _principalAmount Principal loan amount
     * @param _interestRate Annual interest rate in basis points
     * @param _term Loan term in months
     * @param _collateralType Type of collateral
     * @param _collateralValue Value of collateral
     * @param _collateralDescription Description of collateral
     * @param _provenanceHash Hash of asset provenance data
     */
    function createLoan(
        address _borrower,
        uint256 _principalAmount,
        uint256 _interestRate,
        uint256 _term,
        string memory _collateralType,
        uint256 _collateralValue,
        string memory _collateralDescription,
        string memory _provenanceHash
    ) external onlyOwner returns (uint256) {
        require(_borrower != address(0), "Invalid borrower address");
        require(_principalAmount > 0, "Principal amount must be greater than 0");
        require(_interestRate > 0 && _interestRate <= 3000, "Invalid interest rate"); // Max 30%
        require(_term > 0 && _term <= 480, "Invalid loan term"); // Max 40 years
        require(_collateralValue >= _principalAmount, "Collateral value must be at least equal to loan amount");

        uint256 loanId = nextLoanId++;
        
        // Calculate monthly payment using compound interest formula
        uint256 monthlyRate = _interestRate.mul(1e18).div(1200); // Convert annual rate to monthly
        uint256 monthlyPayment = _principalAmount.mul(monthlyRate).mul(
            (1e18 + monthlyRate).pow(_term)
        ).div(
            (1e18 + monthlyRate).pow(_term).sub(1e18)
        );

        uint256 totalAmount = monthlyPayment.mul(_term);
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate.add(_term.mul(30 days)); // Approximate month as 30 days

        loans[loanId] = Loan({
            id: loanId,
            borrower: _borrower,
            principalAmount: _principalAmount,
            interestRate: _interestRate,
            term: _term,
            monthlyPayment: monthlyPayment,
            totalAmount: totalAmount,
            remainingBalance: _principalAmount,
            startDate: startDate,
            endDate: endDate,
            status: LoanStatus.Pending,
            collateral: CollateralInfo({
                assetType: _collateralType,
                value: _collateralValue,
                description: _collateralDescription,
                provenanceHash: _provenanceHash
            }),
            isActive: true
        });

        borrowerLoans[_borrower].push(loanId);
        totalLoans = totalLoans.add(1);
        totalVolume = totalVolume.add(_principalAmount);

        // Generate payment schedule
        _generatePaymentSchedule(loanId, monthlyPayment, _term, startDate);

        emit LoanCreated(loanId, _borrower, _principalAmount);
        emit CollateralRegistered(loanId, _collateralType, _collateralValue);

        return loanId;
    }

    /**
     * @dev Approve a pending loan
     * @param _loanId ID of the loan to approve
     */
    function approveLoan(uint256 _loanId) external onlyOwner loanExists(_loanId) validLoanStatus(_loanId, LoanStatus.Pending) {
        loans[_loanId].status = LoanStatus.Active;
        emit LoanApproved(_loanId, loans[_loanId].borrower);
    }

    /**
     * @dev Process a loan payment
     * @param _loanId ID of the loan
     * @param _paymentId ID of the payment to process
     */
    function processPayment(uint256 _loanId, uint256 _paymentId) 
        external 
        payable 
        nonReentrant 
        loanExists(_loanId) 
        validLoanStatus(_loanId, LoanStatus.Active) 
    {
        require(_paymentId < payments[_loanId].length, "Payment does not exist");
        require(payments[_loanId][_paymentId].status == PaymentStatus.Pending, "Payment already processed");
        require(msg.value >= payments[_loanId][_paymentId].amount, "Insufficient payment amount");

        Payment storage payment = payments[_loanId][_paymentId];
        payment.status = PaymentStatus.Paid;
        payment.paidDate = block.timestamp;

        // Update loan balance
        loans[_loanId].remainingBalance = loans[_loanId].remainingBalance.sub(payment.principal);

        // Check if loan is completed
        if (loans[_loanId].remainingBalance == 0) {
            loans[_loanId].status = LoanStatus.Completed;
            emit LoanCompleted(_loanId, loans[_loanId].borrower);
        }

        emit PaymentProcessed(_loanId, _paymentId, payment.amount);
    }

    /**
     * @dev Mark a loan as defaulted
     * @param _loanId ID of the loan to default
     */
    function defaultLoan(uint256 _loanId) external onlyOwner loanExists(_loanId) {
        require(loans[_loanId].status == LoanStatus.Active, "Loan must be active to default");
        loans[_loanId].status = LoanStatus.Defaulted;
        emit LoanDefaulted(_loanId, loans[_loanId].borrower);
    }

    /**
     * @dev Get loan information
     * @param _loanId ID of the loan
     * @return Loan struct
     */
    function getLoan(uint256 _loanId) external view loanExists(_loanId) returns (Loan memory) {
        return loans[_loanId];
    }

    /**
     * @dev Get payment information
     * @param _loanId ID of the loan
     * @param _paymentId ID of the payment
     * @return Payment struct
     */
    function getPayment(uint256 _loanId, uint256 _paymentId) external view returns (Payment memory) {
        require(_loanId < nextLoanId && loans[_loanId].isActive, "Loan does not exist");
        require(_paymentId < payments[_loanId].length, "Payment does not exist");
        return payments[_loanId][_paymentId];
    }

    /**
     * @dev Get all payments for a loan
     * @param _loanId ID of the loan
     * @return Array of Payment structs
     */
    function getLoanPayments(uint256 _loanId) external view returns (Payment[] memory) {
        require(_loanId < nextLoanId && loans[_loanId].isActive, "Loan does not exist");
        return payments[_loanId];
    }

    /**
     * @dev Get loans for a borrower
     * @param _borrower Address of the borrower
     * @return Array of loan IDs
     */
    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }

    /**
     * @dev Get contract statistics
     * @return totalLoans Total number of loans
     * @return totalVolume Total loan volume
     * @return activeLoans Number of active loans
     */
    function getStatistics() external view returns (uint256, uint256, uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].isActive && loans[i].status == LoanStatus.Active) {
                activeCount++;
            }
        }
        return (totalLoans, totalVolume, activeCount);
    }

    /**
     * @dev Generate payment schedule for a loan
     * @param _loanId ID of the loan
     * @param _monthlyPayment Monthly payment amount
     * @param _term Loan term in months
     * @param _startDate Start date of the loan
     */
    function _generatePaymentSchedule(
        uint256 _loanId,
        uint256 _monthlyPayment,
        uint256 _term,
        uint256 _startDate
    ) internal {
        uint256 remainingBalance = loans[_loanId].principalAmount;
        uint256 monthlyRate = loans[_loanId].interestRate.mul(1e18).div(1200);

        for (uint256 i = 0; i < _term; i++) {
            uint256 interestPayment = remainingBalance.mul(monthlyRate).div(1e18);
            uint256 principalPayment = _monthlyPayment.sub(interestPayment);
            
            // Ensure principal payment doesn't exceed remaining balance
            if (principalPayment > remainingBalance) {
                principalPayment = remainingBalance;
            }

            payments[_loanId].push(Payment({
                loanId: _loanId,
                amount: _monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                fees: 0,
                dueDate: _startDate.add((i + 1).mul(30 days)),
                status: PaymentStatus.Pending,
                paidDate: 0
            }));

            remainingBalance = remainingBalance.sub(principalPayment);
        }
    }

    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Emergency pause function (only owner)
     */
    function pause() external onlyOwner {
        // Implementation would depend on using OpenZeppelin's Pausable contract
        // This is a placeholder for emergency functionality
    }
}
