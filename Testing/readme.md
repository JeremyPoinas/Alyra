# Unit testing for the Voting Project

**Author**: Jeremy Poinas 

The test.js file that will find in this folder contains the unit tests written in JS for the Voting.sol smart contract.

# Case tests

I decided to separate the tests from a business point of view, having one *describe* for each phase of the Voting Process based on the WorkflowStatus state:

 1. Voter registration
 2. Proposal registration
 3. Voting session
 4. Tally votes

In each of these phase, I added 3 separations using *describe* :

 1. WorkflowStatus change
 *The basic flow cases where the owner (or someone else) change the state to go to the next state*
 2. Action(s)
 *Focus on the actions that can be done during this phase, while taking into account the events emitted and wrong manipulations that trigger revert*
 3. Forbidden actions during this stage
 *All actions on the WorkflowStatus state or else that should trigger revert in the current phase*

In the current state, the unit testing file contains 63 tests, which is quite important due to the fact that I needed to check in EACH phase that it was impossible to come back to another state (ex: going from VotingSessionEnded to ProposalsRegistrationStarted),
 or try to trigger a forbidden action for this phase (ex: adding a proposal during the Voting session).

## ETH-GAS-REPORTER

Parameters:

 - Solc version: 0.8.13+commit.abaa5c0e
 - Optimizer enabled: false
 - Runs: 200
 - Block limit: 6718946 gas

|Method   |Min     |Max       |Avg         |# calls     |
|---------|--------|----------|----------  |------------|
|addProposal|59100 |59136   |59108 |43
|addVoter|- |- |50220 |137
|endProposalRegistering|- |- |30599 |33
|endVotingSession|- |- |30533 | 18
|setVote|60913 |78013 |73513 |38
|startProposalsRegistering|- |- |94840 |57
|startVotingSession|- |- |30554 |36
|tallyVotes|- |- |63565 |19
|Deployment of Voting|- |- |1970015 |-


## Phase 1: VOTER REGISTRATION

- BeforeEach:
	- Create a new contract instance
	- Set owner as voter and get its record

 - WorkflowStatus Change
	 - workflowStatus should start at: RegisteringVoters
	 - it should revert if someone else than owner try to change WorkflowStatus - startProposalsRegistering
	 - it should revert if someone else than owner to change WorkflowStatus - endProposalsRegistering
	 - it should revert if someone else than owner to change WorkflowStatus - startVotingSession
	 - it should revert if someone else than owner to change WorkflowStatus - endVotingSession
	 - it should revert if someone else than owner to change WorkflowStatus - tallyVotes
	 
 - Set + Get a voter
	 - it should add a voter, get isRegistered
	 - it should add a voter, get hasVoted
	 - it should add a voter, get votedProposalId
	 - it should emit the event VoterRegistered when a voter is registered
	 - it should revert if voter added is already registered
	 - it should revert if msg.sender is not a voter and try to get voter data

- Forbidden actions during this stage
	- it should revert if someone try to add a proposal
	- it should revert if someone try to vote
	- it should revert if workflowStatus goes to ProposalsRegistrationEnded too soon
	- it should revert if workflowStatus goes to VotingSessionStarted too soon
	- it should revert if workflowStatus goes to VotingSessionEnded too soon
	- it should revert if workflowStatus goes to VotesTallied too soon

## Phase 2: PROPOSAL REGISTRATION

- BeforeEach:
	- Create a new contract instance
	- Set owner and second as voters
	- Owner starts the proposal registering

 - WorkflowStatus Change
	 - it should change workflowStatus to ProposalsRegistrationStarted
	 - it should emit an event when workflowStatus changes to ProposalsRegistrationStarted
	 - it should change workflowStatus from ProposalsRegistrationStarted to ProposalsRegistrationEnded
	 - it should emit an event when Proposals Registration is ended
	 
 - Proposal creation and getter
	 - it should create the Genesis proposal - get description
	 - it should create the Genesis proposal - get voteCount
	 - it should create a new proposal - get description
	 - it should create a new proposal - get voteCount
	 - it should emit an event when a new proposal is added
	 - it should revert if the proposal is empty
	 - it should revert if a non-voter try to get a proposal
	 - it should revert if a non-voter try to add a proposal
	 
- Forbidden actions during this stage
	- it should revert if someone try to add a voter
	- it should revert if someone try to vote
	- it should revert if workflowStatus goes back to ProposalsRegistrationStarted from ProposalsRegistrationEnded
	- it should revert if workflowStatus goes to VotingSessionStarted too soon
	- it should revert if workflowStatus goes to VotingSessionEnded too soon
	- it should revert if workflowStatus goes to VotesTallied too soon

## Phase 3: VOTING SESSION

- BeforeEach:
	- Create a new contract instance
	- Set owner and second as voters
	- Start proposal registering and add a proposal from second
	- End the proposal registering and start the voting session

 - WorkflowStatus Change
	 - it should change workflowStatus to VotingSessionStarted
	 - it should emit an event when workflowStatus changes to VotingSessionStarted
	 - it should change workflowStatus from VotingSessionStarted to VotingSessionEnded
	 - it should emit an event when Voting session is ended
	 
 - Vote setter and getter
	 - it should create a vote - update voter info
	 - it should create a vote - update proposal voteCount
	 - it should emit an event when a vote is created
	 - it should revert if voter has already voted
	 - it should revert if the proposal is not found
	 - it should revert if a non-voter try to vote
	 
- Forbidden actions during this stage
	- it should revert if someone try to add a proposal
	- it should revert if someone try to add a voter
	- it should revert if workflowStatus goes back to ProposalsRegistrationStarted from VotingSessionStarted
	- it should revert if workflowStatus goes back to ProposalsRegistrationEnded from VotingSessionStarted
	- it should revert if workflowStatus goes back to ProposalsRegistrationStarted from VotingSessionEnded
	- it should revert if workflowStatus goes back to ProposalsRegistrationEnded from VotingSessionEnded
	- it should revert if workflowStatus goes to VotesTallied too soon 

## Phase 4: TALLY VOTES

- BeforeEach:
	- Create a new contract instance
	- Set owner, second and third as voters
	- Start proposal registering and add two proposals: one from second and one from third
	- End proposal registering and start voting session
	- Owner votes for proposal 1, second for 1, and third for 2
	- Owner ends the voting session and start to tally votes

 - WorkflowStatus Change
	 - it should change workflowStatus to VotesTallied
	 - it should emit an event when workflowStatus changes to VotesTallied
	 
 - Checking winner
	 - it should find the winner
	 
- Forbidden actions during this stage
	- it should revert if someone try to add a voter
	- it should revert if someone try to add a proposal
	- it should revert if someone try to vote
	- it should revert if workflowStatus goes back to ProposalsRegistrationStarted from VotesTallied
	- it should revert if workflowStatus goes back to ProposalsRegistrationEnded from VotesTallied
	- it should revert if workflowStatus goes back to VotingSessionStarted from VotesTallied
	- it should revert if workflowStatus goes back to VotingSessionEnded from VotesTallied
