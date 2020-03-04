var EthMessaging = artifacts.require("EthMessaging");

module.exports = function(deployer) {
  deployer.deploy(EthMessaging);
};