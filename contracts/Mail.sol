// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Mail is Ownable {
    bool contractIsActive = true;
    address _relayer;

    event AccountCreated(address accountAddress, string keyCID);
    event mailSent(address from, address to, string dataCID, uint credits);
    event senderLabelUpdated(address from, address to, string receiverRelationLabel);
    event actionOnMail(address from, address to, string dataCID, string action);
    event creditsAdded(address user, uint amount);
    event creditsTransferred(address from, address to, uint amount);
    event creditsRemoved(address user, uint amount);
    event relayerChanged(address relayer);

    constructor(address relayer) {
        _relayer = relayer;
    }

    function setRelayer(address relayer)
    public
    onlyOwner()
    isActive()
    {
        _relayer = relayer;
        emit relayerChanged(_relayer);
    }

    function createAccount(string calldata keyCID)
    public
    isActive()
    {
        emit AccountCreated(msg.sender, keyCID);
    }

    function createAccount(address from, string calldata keyCID)
    public
    isActive()
    onlyRelayer()
    {
        emit AccountCreated(from, keyCID);
    }

    function sendMail(address to, string calldata dataCID, uint credits)
    public
    isActive()
    {
        emit mailSent(msg.sender, to, dataCID, credits);
    }

    function sendMail(address from, address to, string calldata dataCID, uint credits)
    public
    onlyRelayer()
    isActive()
    {
        emit mailSent(from, to, dataCID, credits);
    }

    function mailAction(address from, address to, string calldata dataCID, string calldata action)
    public
    onlyRelayer()
    isActive()
    {
        emit actionOnMail(from, to, dataCID, action);
    }

    function mailAction(address from, string calldata dataCID, string calldata action)
    public
    isActive()
    {
        emit actionOnMail(from, msg.sender, dataCID, action);
    }

    function modifySenderLabel(address from, string calldata label)
    public
    isActive()
    {
        emit senderLabelUpdated(from, msg.sender, label);
    }

    function modifySenderLabel(address from, address to, string calldata label)
    public
    onlyRelayer()
    isActive()
    {
        emit senderLabelUpdated(from, to, label);
    }

    function addCredits(address user, uint amount)
    public
    onlyRelayer()
    isActive()
    {
        emit creditsAdded(user, amount);
    }

    function transferCredits(address from, address to, uint amount)
    public
    onlyRelayer()
    isActive()
    {
        emit creditsTransferred(from, to, amount);
    }

    function withdrawCredits(address user, uint amount)
    public
    onlyRelayer()
    isActive()
    {
        emit creditsRemoved(user, amount);
    }

    function deprecateContract()
    public
    onlyOwner()
    isActive()
    {
        contractIsActive = false;
    }

    modifier isActive() {
        require(contractIsActive == true, "Contract has been deprecated");
        _;
    }

    modifier onlyRelayer() {
        require(_relayer == _msgSender(), "Message should come from relayer only");
        _;
    }
}