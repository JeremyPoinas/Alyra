// SPDX-License-Identifier: MIT

const Voting = artifacts.require("../contracts/Voting.sol");
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract('Voting', accounts => {
  const [owner, second, third] = accounts;

  let VotingInstance;

  // ::::::::::::: VOTER REGISTRATION ::::::::::::: //


  describe("Voter registration", function () {

    let voter;

    beforeEach(async function () {
      // Create a new contract instance
      VotingInstance = await Voting.new({from:owner});

      // Set owner as voter and get its record
      await VotingInstance.addVoter(owner);
      voter = await VotingInstance.getVoter(owner);
    });

    describe("WorkflowStatus change", function () {
      it("workflowStatus should start at: RegisteringVoters", async () => {
        expect(await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(new BN(0));
      });

      it("should revert if someone else than owner try to change WorkflowStatus - startProposalsRegistering", async () => {
        await expectRevert(VotingInstance.startProposalsRegistering({from:second}), "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner");
      });

      it("should revert if someone else than owner to change WorkflowStatus - endProposalsRegistering", async () => {
        await expectRevert(VotingInstance.endProposalsRegistering({from:second}), "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner");
      });

      it("should revert if someone else than owner to change WorkflowStatus - startVotingSession", async () => {
        await expectRevert(VotingInstance.startVotingSession({from:second}), "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner");
      });

      it("should revert if someone else than owner to change WorkflowStatus - endVotingSession", async () => {
        await expectRevert(VotingInstance.endVotingSession({from:second}), "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner");
      });

      it("should revert if someone else than owner to change WorkflowStatus - tallyVotes", async () => {
        await expectRevert(VotingInstance.tallyVotes({from:second}), "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner");
      });
    });

    describe("Set + Get a voter", function () {
      it("should add a voter, get isRegistered", async () => {
        expect(voter.isRegistered).to.equal(true);
      });

      it("should add a voter, get hasVoted", async () => {
        expect(voter.hasVoted).to.equal(false);
      });

      it("should add a voter, get votedProposalId", async () => {
        expect(new BN(voter.votedProposalId)).to.be.bignumber.equal(new BN(0));
      });

      it("should emit the event VoterRegistered when a voter is registered", async () => {
        const newVoter = await VotingInstance.addVoter(second);
        expectEvent(
          newVoter,
          'VoterRegistered',
          { voterAddress: second }
        );
      });

      it("should revert if voter added is already registered", async () => {
        await expectRevert(VotingInstance.addVoter(owner, {from: owner}), "Already registered");
      });

      it("should revert if msg.sender is not a voter and try to get voter data", async () => {
        await expectRevert(VotingInstance.getVoter(owner, {from: second}), "You're not a voter");
      });
    });

    describe("Forbidden actions during this stage", function () {
      it("should revert if someone try to add a proposal", async () => {
        await expectRevert(VotingInstance.addProposal("description"), "Proposals are not allowed yet");
      });

      it("should revert if someone try to vote", async () => {
        await expectRevert(VotingInstance.setVote(0), "Voting session havent started yet");
      });

      it("should revert if workflowStatus goes to ProposalsRegistrationEnded too soon", async () => {
        await expectRevert(VotingInstance.endProposalsRegistering(), "Registering proposals havent started yet");
      });

      it("should revert if workflowStatus goes to VotingSessionStarted too soon", async () => {
        await expectRevert(VotingInstance.startVotingSession(), "Registering proposals phase is not finished");
      });

      it("should revert if workflowStatus goes to VotingSessionEnded too soon", async () => {
        await expectRevert(VotingInstance.endVotingSession(), "Voting session havent started yet");
      });

      it("should revert if workflowStatus goes to VotesTallied too soon", async () => {
        await expectRevert(VotingInstance.tallyVotes(), "Current status is not voting session ended");
      });
    });
  });


  // ::::::::::::: PROPOSAL REGISTRATION ::::::::::::: //


  describe("Proposal registration", function () {
    let statusChange;

    beforeEach(async function () {
      // Create a new contract instance
      VotingInstance = await Voting.new({from:owner});

      // Set owner and second as voters
      await VotingInstance.addVoter(owner);
      await VotingInstance.addVoter(second);

      // Owner starts the proposal registering
      statusChange = await VotingInstance.startProposalsRegistering({from:owner});
    });

    describe("WorkflowStatus change", function () {
      it("should change workflowStatus to ProposalsRegistrationStarted", async () => {
        expect(await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(new BN(1));
      });

      it("should emit an event when workflowStatus changes to ProposalsRegistrationStarted", async () => {
        expectEvent(
          await statusChange,
          'WorkflowStatusChange',
          { previousStatus: new BN(0),  newStatus: new BN(1) }
        );
      });
      
      it("should change workflowStatus from ProposalsRegistrationStarted to ProposalsRegistrationEnded", async () => {
        await VotingInstance.endProposalsRegistering();
        expect(await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(new BN(2));
      });

      it("should emit an event when Proposals Registration is ended", async () => {
        expectEvent(
          await VotingInstance.endProposalsRegistering(),
          'WorkflowStatusChange',
          { previousStatus: new BN(1),  newStatus: new BN(2) }
        );
      });
    });

    describe("Proposal creation and getter", function () {
      it("should create the Genesis proposal - get description", async () => {
        const genesis = await VotingInstance.getOneProposal(0);
        expect(genesis.description).to.equal("GENESIS");
      });

      it("should create the Genesis proposal - get voteCount", async () => {
        const genesis = await VotingInstance.getOneProposal(0);
        expect(genesis.voteCount).to.be.bignumber.equal(new BN(0));
      });

      it("should create a new proposal - get description", async () => {
        await VotingInstance.addProposal("description");
        const newProposal = await VotingInstance.getOneProposal(1);
        expect(newProposal.description).to.equal("description");
      });

      it("should create a new proposal - get voteCount", async () => {
        await VotingInstance.addProposal("description");
        const newProposal = await VotingInstance.getOneProposal(1);
        expect(newProposal.voteCount).to.be.bignumber.equal(new BN(0));
      });

      it("should emit an event when a new proposal is added", async () => {
        expectEvent(
          await VotingInstance.addProposal("description"),
          'ProposalRegistered',
          { proposalId: new BN(1) }
        );
      });

      it("should revert if the proposal is empty", async () => {
        await expectRevert(VotingInstance.addProposal(""), "Vous ne pouvez pas ne rien proposer");
      });

      it("should revert if a non-voter try to get a proposal", async () => {
        await expectRevert(VotingInstance.getOneProposal(0, {from: third}), "You're not a voter");
      });

      it("should revert if a non-voter try to add a proposal", async () => {
        await expectRevert(VotingInstance.addProposal("description", {from: third}), "You're not a voter");
      });
    });

    describe("Forbidden actions during this stage", function () {
      it("should revert if someone try to add a voter", async () => {
        await expectRevert(VotingInstance.addVoter(third), "Voters registration is not open yet");
      });

      it("should revert if someone try to vote", async () => {
        await expectRevert(VotingInstance.setVote(0), "Voting session havent started yet");
      });

      it("should revert if workflowStatus goes back to ProposalsRegistrationStarted from ProposalsRegistrationEnded", async () => {
        await VotingInstance.endProposalsRegistering()
        await expectRevert(VotingInstance.startProposalsRegistering(), "Registering proposals cant be started now");
      });

      it("should revert if workflowStatus goes to VotingSessionStarted too soon", async () => {
        await expectRevert(VotingInstance.startVotingSession(), "Registering proposals phase is not finished");
      });

      it("should revert if workflowStatus goes to VotingSessionEnded too soon", async () => {
        await expectRevert(VotingInstance.endVotingSession(), "Voting session havent started yet");
      });

      it("should revert if workflowStatus goes to VotesTallied too soon", async () => {
        await expectRevert(VotingInstance.tallyVotes(), "Current status is not voting session ended");
      });
    });
  });


  // ::::::::::::: VOTING SESSION ::::::::::::: //


  describe("Voting session", function () {
    let statusChange;

    beforeEach(async function () {
      // Create a new contract instance
      VotingInstance = await Voting.new({from:owner});
      
      // Set owner and second as voters
      await VotingInstance.addVoter(owner);
      await VotingInstance.addVoter(second);

      // Start proposal registering and add a proposal from second
      await VotingInstance.startProposalsRegistering({from:owner});
      await VotingInstance.addProposal("My proposal", {from: second});

      // End the proposal registering and start the voting session
      await VotingInstance.endProposalsRegistering({from:owner});
      statusChange = await VotingInstance.startVotingSession({from:owner});
    });

    describe("WorkflowStatus change", function () {
      it("should change workflowStatus to VotingSessionStarted", async () => {
        expect(await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(new BN(3));
      });

      it("should emit an event when workflowStatus changes to VotingSessionStarted", async () => {
        expectEvent(
          await statusChange,
          'WorkflowStatusChange',
          { previousStatus: new BN(2),  newStatus: new BN(3) }
        );
      });
      
      it("should change workflowStatus from VotingSessionStarted to VotingSessionEnded", async () => {
        await VotingInstance.endVotingSession();
        expect(await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(new BN(4));
      });

      it("should emit an event when Voting session is ended", async () => {
        expectEvent(
          await VotingInstance.endVotingSession(),
          'WorkflowStatusChange',
          { previousStatus: new BN(3),  newStatus: new BN(4) }
        );
      });
    });

    describe("Vote setter and getter", function () {
      it("should create a vote - update voter info", async () => {
        await VotingInstance.setVote(1, {from:owner});
        expect((await VotingInstance.getVoter(owner)).votedProposalId).to.be.bignumber.equal(new BN(1));
        expect((await VotingInstance.getVoter(owner)).hasVoted).to.be.true;
      });

      it("should create a vote - update proposal voteCount", async () => {
        await VotingInstance.setVote(1, {from:owner});
        expect((await VotingInstance.getOneProposal(1)).voteCount).to.be.bignumber.equal(new BN(1));
      });

      it("should emit an event when a vote is created", async () => {
        const Voted = await VotingInstance.setVote(1, {from:owner});
        expectEvent(
          await Voted,
          'Voted',
          { voter: owner,  proposalId: new BN(1) }
        );
      });

      it("should revert if voter has already voted", async () => {
        await VotingInstance.setVote(1, {from:owner});
        await expectRevert(VotingInstance.setVote(1, {from:owner}), "You have already voted");
      });

      it("should revert if the proposal is not found", async () => {
        await expectRevert(VotingInstance.setVote(10, {from:owner}), "Proposal not found");
      });

      it("should revert if a non-voter try to vote", async () => {
        await expectRevert(VotingInstance.setVote(1, {from: third}), "You're not a voter");
      });
    });

    describe("Forbidden actions during this stage", function () {
      it("should revert if someone try to add a proposal", async () => {
        await expectRevert(VotingInstance.addProposal("description"), "Proposals are not allowed yet");
      });

      it("should revert if someone try to add a voter", async () => {
        await expectRevert(VotingInstance.addVoter(third), "Voters registration is not open yet");
      });

      it("should revert if workflowStatus goes back to ProposalsRegistrationStarted from VotingSessionStarted", async () => {
        await expectRevert(VotingInstance.startProposalsRegistering(), "Registering proposals cant be started now");
      });

      it("should revert if workflowStatus goes back to ProposalsRegistrationEnded from VotingSessionStarted", async () => {
        await expectRevert(VotingInstance.endProposalsRegistering(), "Registering proposals havent started yet");
      });

      it("should revert if workflowStatus goes back to ProposalsRegistrationStarted from VotingSessionEnded", async () => {
        await VotingInstance.endVotingSession();
        await expectRevert(VotingInstance.startProposalsRegistering(), "Registering proposals cant be started now");
      });

      it("should revert if workflowStatus goes back to ProposalsRegistrationEnded from VotingSessionEnded", async () => {
        await VotingInstance.endVotingSession();
        await expectRevert(VotingInstance.endProposalsRegistering(), "Registering proposals havent started yet");
      });

      it("should revert if workflowStatus goes to VotesTallied too soon", async () => {
        await expectRevert(VotingInstance.tallyVotes(), "Current status is not voting session ended");
      });
    });
  });


  // ::::::::::::: TALLY VOTES ::::::::::::: //


  describe("Tally votes", function () {
    let statusChange;

    beforeEach(async function () {
      // Create a new contract instance
      VotingInstance = await Voting.new({from:owner});

      // Set owner, second and third as voters
      await VotingInstance.addVoter(owner);
      await VotingInstance.addVoter(second);
      await VotingInstance.addVoter(third);

      // Start proposal registering and add two proposals: one from second and one from third
      await VotingInstance.startProposalsRegistering({from:owner});
      await VotingInstance.addProposal("My proposal", {from: second});
      await VotingInstance.addProposal("Other proposal", {from: third});

      // End proposal registering and start voting session
      await VotingInstance.endProposalsRegistering({from:owner});
      await VotingInstance.startVotingSession({from:owner});

      // Owner votes for proposal 1, second for 1, and third for 2
      await VotingInstance.setVote(1, {from:owner});
      await VotingInstance.setVote(1, {from:second});
      await VotingInstance.setVote(2, {from:third});

      // Owner ends the voting session and start to tally votes
      await VotingInstance.endVotingSession({from:owner});
      statusChange = await VotingInstance.tallyVotes({from:owner});
    });

    describe("WorkflowStatus change", function () {
      it("should change workflowStatus to VotesTallied", async () => {
        expect(await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(new BN(5));
      });

      it("should emit an event when workflowStatus changes to VotesTallied", async () => {
        expectEvent(
          await statusChange,
          'WorkflowStatusChange',
          { previousStatus: new BN(4),  newStatus: new BN(5) }
        );
      });
    });

    describe("Checking winner", function () {
      it("should find the winner", async () => {
        expect(await VotingInstance.winningProposalID.call()).to.be.bignumber.equal(new BN(1));
      });
    });

    describe("Forbidden actions during this stage", function () {
      it("should revert if someone try to add a voter", async () => {
        await expectRevert(VotingInstance.addVoter(third), "Voters registration is not open yet");
      });

      it("should revert if someone try to add a proposal", async () => {
        await expectRevert(VotingInstance.addProposal("description"), "Proposals are not allowed yet");
      });

      it("should revert if someone try to vote", async () => {
        await expectRevert(VotingInstance.setVote(0), "Voting session havent started yet");
      });

      it("should revert if workflowStatus goes back to ProposalsRegistrationStarted from VotesTallied", async () => {
        await expectRevert(VotingInstance.startProposalsRegistering(), "Registering proposals cant be started now");
      });

      it("should revert if workflowStatus goes back to ProposalsRegistrationEnded from VotesTallied", async () => {
        await expectRevert(VotingInstance.endProposalsRegistering(), "Registering proposals havent started yet");
      });

      it("should revert if workflowStatus goes back to VotingSessionStarted from VotesTallied", async () => {
        await expectRevert(VotingInstance.startVotingSession(), "Registering proposals phase is not finished");
      });

      it("should revert if workflowStatus goes back to VotingSessionEnded from VotesTallied", async () => {
        await expectRevert(VotingInstance.endVotingSession(), "Voting session havent started yet");
      });
    });
  });
});
