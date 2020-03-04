# eth-messaging
![Screenshot](https://www.dropbox.com/s/6p5wxxmwobrja83/ethMessagingScreenshot.png?raw=1)

This project is my solution for a challenge proposed at my current company [ioBuilders](https://io.builders/).

In summary, the challenge consists in a dapp for sending messages between ethereum accounts. The following points should be achieved:
* Message data should be stored off-chain in an external repository.
* Only the receiver of the message should be able to read the message, no one else.
* It should be possible to send anonymous messages.

### Tech stack
* [Solidity](https://solidity.readthedocs.io/en/v0.4.25/index.html) as the language for the smart contract. Smart contract is based on this [EIP](https://github.com/ethereum/EIPs/issues/802).
* [Solidity-coverage](https://github.com/sc-forks/solidity-coverage) for checking smart contract coverage and [Solium](https://github.com/duaraghav8/Ethlint) for analizing code style and security issues.
* [Truffle](https://github.com/trufflesuite/truffle) and [ganache-cli](https://github.com/trufflesuite/ganache-cli) for smart contract testing and deployment.
* [Swarm](https://swarm-guide.readthedocs.io/en/latest/introduction.html) node for storing message data.
* [Npm](https://www.npmjs.com/) as package and project manager.
* [Lite-server](https://github.com/johnpapa/lite-server) as development server.
* [Metamask](https://metamask.io/) for interacting with DLT from web browser.
* Front-end libraries:
	* [Bootstrap](https://getbootstrap.com/) and [jQuery](https://jquery.com/).
	* [Eth-ecies](https://github.com/LimelabsTech/eth-ecies) for encrypting/decrypting messages.
	* [Erebos](https://github.com/MainframeHQ/erebos) as swarm client.
	* [Web3js](https://github.com/ethereum/web3.js/) and [ethereumjs-util](https://github.com/ethereumjs/ethereumjs-util).

### How to test
#### Step 1:
Run ```npm install```.

#### Step 2:
Run a local swarm node with docker ```docker run -p 8500:8500 -e PASSWORD=password123 -t ethdevops/swarm --httpaddr 0.0.0.0```.

### Step 3:
Execute ```npm run dev```. This will start ganache-cli, deploy smart contract wih truffle and deploy and run the application with lite-server on port 3000.

Ganache-cli is started with 4 predefined ethereum private keys you can use to test the dapp:
* **Alice** -> ```9b3b72cc4b29b4e7d0c39962ca3a7db11e1e60a1353e39705d82b36012694caf```
* **Bob** -> ```eeb80a1e35c9db4dabd237edb5fd2827312ac2ce32723f163d067169c870eff1```
* **Frank** -> ```b5a3091a455b493dab6f53825b92301f2f77ea9bbe2ff4bb5e65486e97126b39```
* ```e5a90dceea42ad2ec7360f08185089ba6187f3422d974872cff5219801f8c84b``` for sending anonymous messages.

For testing how messages are sent from one account to another, you should import at least 2 of these accounts into Metamask in differenct browser instances. 
In Chrome, each instance should have a different profile. For opening Chrome with a different profile than default in linux, execute ```google-chrome --profile-directory=Temp```.
Also CORS should be enabled to be able to interact with swarm, i suggest to use [this](https://chrome.google.com/webstore/detail/moesif-origin-cors-change/digfbfaphojjndkpccljibejjbppifbc) chrome plugin. 

### Additional commands
Execute contract tests:
```
npm run truffle test
```
Execute contract tests with coverage:
```
./node_modules/.bin/solidity-coverage
```
Execute Solium:
```
npm run solium
```


