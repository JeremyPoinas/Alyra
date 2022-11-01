// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    
    mapping (address => Voter) whitelist;
    address[] users;

    struct Proposal {
        string description;
        uint voteCount;
    }
    
    Proposal[] proposals;

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public state;

    uint public winningProposalId;

    event VoterRegistered(address voterAddress);
    event VoterRemoved(address voterAddress); 
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);
    event NewSession ();

    modifier onlyWhitelisted() {
        require(whitelist[msg.sender].isRegistered == true, "You are not whitelisted.");
        _;
    } 

    function changeState (uint _newState) public onlyOwner {
        state = WorkflowStatus(_newState);
        emit WorkflowStatusChange(WorkflowStatus(_newState - 1), WorkflowStatus(_newState));
    }

    function addToWhitelist (address _addr) public onlyOwner {
        require(state == WorkflowStatus(0), "It is too late to change voters.");
        require(whitelist[_addr].isRegistered == false, "This address is already registered.");

        whitelist[_addr].isRegistered = true;
        users.push(_addr);
        emit VoterRegistered(_addr);
    }

    function removeFromWhitelist (address _addr) public onlyOwner {
        require(state == WorkflowStatus(0), "It is too late to change voters.");
        require(whitelist[_addr].isRegistered == true, "This address is not registered.");

        whitelist[_addr].isRegistered = false;
        emit VoterRemoved(_addr);
    }

    function submitProposal (string calldata _description) public onlyWhitelisted {
        require(state == WorkflowStatus(1), "Proposals registration is currently closed. Please, try again later.");
        
        proposals.push(Proposal(_description, 0));
        emit ProposalRegistered(proposals.length - 1);
    }

    function getProposal (uint _proposalId) public view onlyWhitelisted returns(Proposal memory) {
        return proposals[_proposalId];
    }

    function getProposals () public view onlyWhitelisted returns(Proposal[] memory) {
        return proposals;
    }

    function vote (uint _proposalId) public onlyWhitelisted {
        require(state == WorkflowStatus(3), "Voting session is currently closed. Please, try again later.");
        require(whitelist[msg.sender].hasVoted == false, "You have already voted for this session.");

        proposals[_proposalId].voteCount++;
        whitelist[msg.sender].hasVoted = true;
        whitelist[msg.sender].votedProposalId = _proposalId;

        emit Voted(msg.sender, _proposalId);
    }

    function getWinner () public onlyOwner returns (Proposal memory) {
        require(state == WorkflowStatus(5), "You must close the voting session before getting the winner.");
        require(proposals.length > 1, "You need more than one proposal to organize a voting session.");

        Proposal memory winner = proposals[0];
        for (uint i = 1; i < proposals.length; i++) {
            if (proposals[i].voteCount > winner.voteCount) {
                winner = proposals[i];
                winningProposalId = i; 
            }
        }
        return winner;
    }

    function reset () public onlyOwner {
        state = WorkflowStatus(0);
        winningProposalId = 0;
        delete proposals;
        for (uint i = 0; i < users.length; i++) {
            delete whitelist[users[i]];
        }
        delete users;
        emit NewSession();
    }
}
