const truffleAssert = require('truffle-assertions');
const EthMessaging = artifacts.require("./EthMessaging.sol");

contract("EthMessaging", async (accounts) => {

    describe('setPublicKey', () => {
        it('When setting public key, if the public key is empty, the transaction is reverted', async () => {
            const contract = await EthMessaging.deployed();

            await truffleAssert.reverts(contract.setPublicKey(''));
        });

        it('When setting public key, PublicKeyUpdated event is emitted', async () => {
            const key = 'testPublicKey';
            const contract = await EthMessaging.deployed();

            const resultSet = await contract.setPublicKey(key);
            truffleAssert.eventEmitted(resultSet, 'PublicKeyUpdated', (_event) => {
                return _event.sender === accounts[0] && _event.key === key;
            }, 'PublicKeyUpdated should be emitted with correct parameters');
        });
    });

    describe('getPublicKey', () => {
        it('When getting public key, if public key is not set, empty string is returned', async () => {
            const contract = await EthMessaging.deployed();

            assert.equal(await contract.getPublicKey(accounts[1]), '');
        });

        it('When getting public key, address public key is returned', async () => {
            const key = 'testPublicKey';
            const contract = await EthMessaging.deployed();

            const resultSet = await contract.setPublicKey(key);
            assert.equal(await contract.getPublicKey(accounts[0]), key);
        });
    });

    describe('sendMessage', () => {
        it('When sending a message to address 0, the transaction is reverted', async () => {
            const contract = await EthMessaging.deployed();

            await truffleAssert.reverts(contract.sendMessage('0x0000000000000000000000000000000000000000', 'testHash'));
        });

        it('When sending an empty message, the transaction is reverted', async () => {
            const contract = await EthMessaging.deployed();
            await contract.setPublicKey('testPublicKey', {from: accounts[1]});

            await truffleAssert.reverts(contract.sendMessage(accounts[1], ''));
        });

        it('When sending a message, if the receiver does not have public key, the transaction is reverted', async () => {
            const contract = await EthMessaging.deployed();

            await truffleAssert.reverts(contract.sendMessage(accounts[2], 'testHash'));
        });

        it('When sending a message, MessageSent event is emitted', async () => {
            const contract = await EthMessaging.deployed();
            const hash = 'testHash';
            await contract.setPublicKey('testPublicKey', {from: accounts[3]});
            const resultSet = await contract.sendMessage(accounts[3], hash);

            truffleAssert.eventEmitted(resultSet, 'MessageSent', (_event) => {
                return _event.sender === accounts[0] && _event.receiver === accounts[3]
                    && _event.time !== undefined && _event.hash === hash;
            }, 'MessageSent should be emitted with correct parameters');
            // assert.equal(await contract.lastIndex(accounts[3]), 1);
        });
    });

    describe('lastIndex', () => {
        it('When getting lastIndex, if no message has been sent to that address, 0 is returned', async () => {
            const contract = await EthMessaging.deployed();

            assert.equal(await contract.lastIndex(accounts[4]), 0);
        });

        it('When a message is sent, lastIndex is increased', async () => {
            const contract = await EthMessaging.deployed();
            const hash = 'testHash';
            await contract.setPublicKey('testPublicKey', {from: accounts[5]});
            await contract.sendMessage(accounts[5], hash);

            assert.equal(await contract.lastIndex(accounts[5]), 1);
            await contract.sendMessage(accounts[5], hash);
            assert.equal(await contract.lastIndex(accounts[5]), 2);
        });
    });

    describe('getLastMessage', () => {
        it('When getting last message, if address does not have any message, the transaction is reverted', async () => {
            const contract = await EthMessaging.deployed();

            await truffleAssert.reverts(contract.getLastMessage(accounts[6]));
        });

        it('When getting last message, last address message is returned', async () => {
            const contract = await EthMessaging.deployed();
            const hash = 'testHash';
            const hash2 = 'testHash2';
            await contract.setPublicKey('testPublicKey', {from: accounts[7]});
            await contract.sendMessage(accounts[7], hash);

            let messageResult = await contract.getLastMessage(accounts[7]);
            assert.equal(messageResult[0], accounts[0]);
            assert.equal(messageResult[1], hash);
            assert.isBelow(new Date(messageResult[2].toNumber() * 1000), new Date());

            await contract.sendMessage(accounts[7], hash2);
            messageResult = await contract.getLastMessage(accounts[7]);
            assert.equal(messageResult[0], accounts[0]);
            assert.equal(messageResult[1], hash2);
            assert.isBelow(new Date(messageResult[2].toNumber() * 1000), new Date());
        });
    });

    describe('getMessageByIndex', () => {
        it('When getting message by index, if no message exists for that index the transaction is reverted', async () => {
            const contract = await EthMessaging.deployed();

            await truffleAssert.reverts(contract.getMessageByIndex(accounts[8], 30));
        });

        it('When getting message by index, address message related to that index is returned', async () => {
            const contract = await EthMessaging.deployed();
            const hash = 'testHash';
            await contract.setPublicKey('testPublicKey', {from: accounts[9]});
            await contract.sendMessage(accounts[9], hash);

            const messageResult = await contract.getMessageByIndex(accounts[9], 1);
            assert.equal(messageResult[0], accounts[0]);
            assert.equal(messageResult[1], hash);
            assert.isBelow(new Date(messageResult[2].toNumber() * 1000), new Date());
        });
    });
});

