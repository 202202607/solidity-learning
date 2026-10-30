// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract ManagedAccess {
    address public owner;
    address[] public managers;
    mapping(address => bool) public isManager;
    mapping(address => bool) public confirmed;

    uint256 public Count;

    constructor(address[] memory _managers) {
        owner = msg.sender;
        require(_managers.length >= 3, "Need at least 3 managers");
        for (uint256 i = 0; i < _managers.length; i++) {
            address manager = _managers[i];

            require(manager != address(0), "Invalid manager");
            require(!isManager[manager], "Duplicate manager");

            managers.push(manager);
            isManager[manager] = true;
        }
    }

    function confirm() external {
        require(isManager[msg.sender], "You are not a manager");
        require(!confirmed[msg.sender], "Already confirmed");

        confirmed[msg.sender] = true;
        Count++;
    }

    modifier onlyAllConfirmed(){
        require(isManager[msg.sender], "You are not a manager");
        require(Count == managers.length, "Not all confirmed yet");
        _;

        for (uint256 i = 0; i < managers.length; i++) {
            confirmed[managers[i]] = false;
        }
        Count = 0;
    }

    modifier onlyManager(){
        require(isManager[msg.sender], "You are not a manager");
        _;
    }

    modifier onlyOwner(){
        require(msg.sender == owner, "You are not a Owner");
        _;
    }
}