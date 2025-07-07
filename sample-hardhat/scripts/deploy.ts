import { ethers } from "hardhat";
async function main() {
  const SimpleContract = await ethers.getContractFactory("SimpleContract");
  const simple = await SimpleContract.deploy("Hello from Sepolia!");
  await simple.waitForDeployment();

  console.log(`✅ Deployed to: ${simple.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
