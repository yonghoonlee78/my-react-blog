import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleContract", () => {
  let simpleContract: any;
  let owner: any;
  let addr1: any;

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleContract");
    simpleContract = await Factory.deploy("Hello, Contract!");
    await simpleContract.waitForDeployment();
  });

  it("배포 후 기본 메시지 확인", async () => {
    expect(await simpleContract.message()).to.equal("Hello, Contract!");
  });

  it("setMessage() 정상 동작", async () => {
    await simpleContract.setMessage("New Message");
    expect(await simpleContract.message()).to.equal("New Message");
  });

  it("다른 계정도 setMessage() 가능", async () => {
    await simpleContract.connect(addr1).setMessage("Another");
    expect(await simpleContract.message()).to.equal("Another");
  });
});
