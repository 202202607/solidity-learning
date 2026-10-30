import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, TinyBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TinyBank", () => {
    let signers: HardhatEthersSigner[];
    let myTokenC: MyToken;
    let tinyBankC: TinyBank;
    beforeEach(async () => {
        signers = await hre.ethers.getSigners();

        const managers = [
            signers[0].address,
            signers[1].address,
            signers[2].address
        ]

        myTokenC = await hre.ethers.deployContract("MyToken", [
            "MyToken",
            "MT",
            DECIMALS,
            MINTING_AMOUNT,
            managers
        ]);

        tinyBankC = await hre.ethers.deployContract("TinyBank", [
            await myTokenC.getAddress(),
            managers,
        ]);
        await myTokenC.setManager(await tinyBankC.getAddress());
    });

    describe("Initialized state check", () => {
        it("should return totalStaked 0", async () => {
            expect(await tinyBankC.totalStaked()).equal(0);
        });
        it("should return staked 0 amount of signer0", async () => {
            const signer0 = signers[0];
            expect(await tinyBankC.staked(signer0.address)).equal(0);
        })
    });

    describe("Staking", async () => {
        it("should return staked amount", async () => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
            await tinyBankC.stake(stakingAmount);
            expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
            expect(await tinyBankC.totalStaked()).equal(stakingAmount);
            expect(await myTokenC.balanceOf(tinyBankC)).equal(
                await tinyBankC.totalStaked()
            );
        });

        describe("Withdraw", () => {
            it("should return 0 after withdrawing total token",  async () => {
                const signer0 = signers[0];
                const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
                await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
                await tinyBankC.stake(stakingAmount);
                await tinyBankC.withdraw(stakingAmount);
                expect(await tinyBankC.staked(signer0.address)).equal(0);
            });
        });

        describe("reward", () => {
            it("should reward 1MT every blocks", async () => {
                const signer0 = signers[0];
                const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
                await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
                await tinyBankC.stake(stakingAmount);

                const BLOCKS = 5n;
                const transAmount = hre.ethers.parseUnits("1", DECIMALS);
                for(var i = 0; i < BLOCKS; i++){
                    await myTokenC.transfer(transAmount, signer0.address);
                }

                await tinyBankC.withdraw(stakingAmount);
                expect(await myTokenC.balanceOf(signer0.address)).equal(
                    hre.ethers.parseUnits((BLOCKS  + MINTING_AMOUNT + 1n).toString())
                );
            });
        });

        it("should revert when changing rewardPerBlock by hacker", async () => {
            const hacker = signers[3];
            const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);
            await expect(tinyBankC.connect(hacker).setRewardPerBlock(rewardToChange)
            ).to.be.revertedWith("You are not a manager");
        });
    });
    
    describe("setRewardPerBlock", () => {
        const amount = 100n;

        it("should revert when caller is not a manager", async () => {
            const hacker = signers[3];

            await expect(
                tinyBankC.connect(hacker).setRewardPerBlock(amount)
            ).to.be.revertedWith("You are not a manager");
        });

        it("should revert when not all managers confirmed", async () => {
            await tinyBankC.connect(signers[0]).confirm();
            await tinyBankC.connect(signers[1]).confirm();

            await expect(
                tinyBankC.connect(signers[0]).setRewardPerBlock(amount)
            ).to.be.revertedWith("Not all confirmed yet");
        });

        it("should update reward when all managers confirmed", async () => {
            await tinyBankC.connect(signers[0]).confirm();
            await tinyBankC.connect(signers[1]).confirm();
            await tinyBankC.connect(signers[2]).confirm();

            await tinyBankC.connect(signers[0]).setRewardPerBlock(amount);

            expect(await tinyBankC.rewardPerBlock()).to.equal(amount);
        });

        it("should reset confirmations after updating", async () => {
            for (let i = 0; i < 3; i++) {
                await tinyBankC.connect(signers[i]).confirm();
            }

            await tinyBankC.connect(signers[0]).setRewardPerBlock(amount);

            await expect(
                tinyBankC.connect(signers[0]).setRewardPerBlock(200n)
            ).to.be.revertedWith("Not all confirmed yet");
        });
    });
});