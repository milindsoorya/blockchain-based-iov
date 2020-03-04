const KEY_PK = 'pk';
const ANONYMOUS_ADDRESS = '0x5818E2DB3D4f070f301f04fA9db7B98dF3633F30';
App = {
    swarmClient: new Erebos.SwarmClient('http://localhost:8500'),
    ethMessagingContract: null,
    anonymousethMessagingContract: null,
    users: [],
    user: null,
    messages: {},

    init: async () => {
        // Load users.
        await $.getJSON('../users.json', (data) => {
            App.users = data;
        });

        return App.initWeb3();
    },

    initWeb3: async () => {
        // Is there an injected web3 instance?
        if (typeof web3 !== 'undefined') {
            // App.web3Provider = web3.currentProvider;
            await ethereum.enable();
            web3 = new Web3(web3.currentProvider);
            if (web3.eth.accounts.length === 1) {
                return App.initContract();
            }
        }
        App.error('Connect to Metamask to start using the application.');
    },

    initContract: async () => {
        let contract = null;
        let anonymousContract = null;
        await $.getJSON('EthMessaging.json', (data) => {
            // Get the necessary contract artifact file and instantiate it with truffle-contract
            let contractArtifact = data;
            contract = TruffleContract(contractArtifact);
            anonymousContract = TruffleContract(contractArtifact);

            // Set the provider for our contract
            contract.setProvider(web3.currentProvider);
            // Set the provider for sending anonymous messages
            anonymousContract.setProvider(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
        });
        App.ethMessagingContract = await contract.deployed();
        App.anonymousethMessagingContract = await anonymousContract.deployed();

        return App.initUser();
    },

    initUser: async () => {
        // Find current logged user
        App.user = App.getUser(web3.eth.accounts[0]);
        if (App.user) {
            $('#userName').html(App.user.name);
            $('#addr').html(App.user.address);
            return App.initUsersSelect();
        }
        App.error('User not found.');
    },

    initUsersSelect: () => {
        App.users.forEach((user) => {
            if (user.address.toLowerCase() !== web3.eth.accounts[0]) {
                $('#receiver').append($('<option>', {value: user.address, text: user.name}));
            }
        });

        return App.loadMessages();
    },

    setPublicKey: async () => {
        let contractPublicKey = await App.ethMessagingContract.getPublicKey.call(web3.eth.accounts[0]);
        if (!contractPublicKey) {
            // Set public key if it is not already set in order to be able to receive messages.
            contractPublicKey = util.privateToPublic(new Buffer(sessionStorage.getItem(KEY_PK), 'hex')).toString('hex');
            App.ethMessagingContract.setPublicKey(contractPublicKey).catch((err) => {
                App.error('Error setting public key: ' + err.message);
            });
        }
    },

    setPrivateKey: () => {
        sessionStorage.removeItem(KEY_PK);
        let address = null;
        try {
            address = '0x' + util.privateToAddress(new Buffer($('#pk').val(), 'hex')).toString('hex');
        } catch (e) {
            console.log(e);
        }
        if (address !== web3.eth.accounts[0]) {
            $('#pkModal').modal('hide');
            App.error('Private key does not match not current account.');
        } else {
            sessionStorage.setItem(KEY_PK, $('#pk').val());
            $('#pkModal').modal('hide');
            App.setPublicKey();
        }
    },

    loadMessages: async () => {
        if (sessionStorage.getItem(KEY_PK)) {
            let lastIndex = await App.ethMessagingContract.lastIndex.call(web3.eth.accounts[0]);
            while (lastIndex > 0) {
                let indexMessage = await App.ethMessagingContract.getMessageByIndex.call(web3.eth.accounts[0], lastIndex);
                App.loadMessage(indexMessage[0], indexMessage[1], indexMessage[2], false); // 0 address, 1 hash, 2 date
                lastIndex--;
            }
        }

        return App.bindEvents();
    },

    loadMessage: async (address, hash, date, append) => {
        let decryptedMessage = await App.decryptMessage(hash);
        App.messages[hash] = decryptedMessage;

        // Message
        let messageSpan = $('<span>');
        let sender = App.getUser(address);
        sender = sender ? sender.name : 'Anonymous  (Verified User)';
        messageSpan.append(sender + ' : ' + decryptedMessage);

        // Message date
        let dateSpan = $('<span style="float: right">');
        dateSpan.append(new Date(date.toNumber() * 1000).toLocaleString());

        let messageDiv = $('<div class="alert alert-info" role="alert">');
        messageDiv.append(messageSpan);
        messageDiv.append(dateSpan);
        if (append) {
            $('#messages').append(messageDiv);
        } else {
            $('#messages').prepend(messageDiv);
        }
    },

    getUser: (address) => {
        return App.users.find((user) => {
            return user.address.toLowerCase() === address;
        });
    },

    bindEvents: () => {
        $('#sendMessageButton').click(App.sendMessage);
        $('#police').click(App.sendMessagepolice);
        $('#trafficjam').click(App.sendMessagetraffic);
        $('#badweather').click(App.sendMessageweather);
        $('#importPrivateKey').click(() => {
            $('#pk').val('');
            $('#pkModal').modal('show');
        });
        $('#confirmPk').click(App.setPrivateKey);
        let messageSentEvent = App.ethMessagingContract.MessageSent();
        messageSentEvent.watch(App.receiveMessage);
    },
    sendMessageweather: async () => {
        let senderPublicKey = await App.ethMessagingContract.getPublicKey.call(web3.eth.accounts[0]);
        if (!sessionStorage.getItem(KEY_PK) || !senderPublicKey) {
            App.error('You need to import your private key in order to send/receive messages.');
            return;
        }
        let receiverPublicKey = await App.ethMessagingContract.getPublicKey.call($('#receiver').val());
        if (!receiverPublicKey) {
            App.error('Cannot send message because receiver has not set its private key.');
            return;
        }
        let message = "Bad weather condition Olavakkode";
        let encryptedMessage = ecies.encrypt(new Buffer(receiverPublicKey, 'hex'), message).toString('base64');
        let hash = await App.swarmClient.bzz.upload(encryptedMessage, {
            contentType: 'text/plain',
            encrypt: true
        });

        if ($('#anonymousCheck').is(':checked')) {
            // Send message as anonymous. All anonymous messages will be sent with the same address.
            let gasAmount = await App.anonymousethMessagingContract.sendMessage.estimateGas($('#receiver').val(), hash, {from: ANONYMOUS_ADDRESS});
            App.anonymousethMessagingContract.sendMessage($('#receiver').val(), hash, {
                gas: gasAmount,
                from: ANONYMOUS_ADDRESS
            }).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        } else {
            App.ethMessagingContract.sendMessage($('#receiver').val(), hash).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        }
    },

    sendMessagetraffic: async () => {
        let senderPublicKey = await App.ethMessagingContract.getPublicKey.call(web3.eth.accounts[0]);
        if (!sessionStorage.getItem(KEY_PK) || !senderPublicKey) {
            App.error('You need to import your private key in order to send/receive messages.');
            return;
        }
        let receiverPublicKey = await App.ethMessagingContract.getPublicKey.call($('#receiver').val());
        if (!receiverPublicKey) {
            App.error('Cannot send message because receiver has not set its private key.');
            return;
        }
        let message = "Traffic block in Palakkad Junction";
        let encryptedMessage = ecies.encrypt(new Buffer(receiverPublicKey, 'hex'), message).toString('base64');
        let hash = await App.swarmClient.bzz.upload(encryptedMessage, {
            contentType: 'text/plain',
            encrypt: true
        });

        if ($('#anonymousCheck').is(':checked')) {
            // Send message as anonymous. All anonymous messages will be sent with the same address.
            let gasAmount = await App.anonymousethMessagingContract.sendMessage.estimateGas($('#receiver').val(), hash, {from: ANONYMOUS_ADDRESS});
            App.anonymousethMessagingContract.sendMessage($('#receiver').val(), hash, {
                gas: gasAmount,
                from: ANONYMOUS_ADDRESS
            }).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        } else {
            App.ethMessagingContract.sendMessage($('#receiver').val(), hash).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        }
    },

    sendMessagepolice: async () => {
        let senderPublicKey = await App.ethMessagingContract.getPublicKey.call(web3.eth.accounts[0]);
        if (!sessionStorage.getItem(KEY_PK) || !senderPublicKey) {
            App.error('You need to import your private key in order to send/receive messages.');
            return;
        }
        let receiverPublicKey = await App.ethMessagingContract.getPublicKey.call($('#receiver').val());
        if (!receiverPublicKey) {
            App.error('Cannot send message because receiver has not set its private key.');
            return;
        }
        let message = "Police in Palakkad Junction";
        let encryptedMessage = ecies.encrypt(new Buffer(receiverPublicKey, 'hex'), message).toString('base64');
        let hash = await App.swarmClient.bzz.upload(encryptedMessage, {
            contentType: 'text/plain',
            encrypt: true
        });

        if ($('#anonymousCheck').is(':checked')) {
            // Send message as anonymous. All anonymous messages will be sent with the same address.
            let gasAmount = await App.anonymousethMessagingContract.sendMessage.estimateGas($('#receiver').val(), hash, {from: ANONYMOUS_ADDRESS});
            App.anonymousethMessagingContract.sendMessage($('#receiver').val(), hash, {
                gas: gasAmount,
                from: ANONYMOUS_ADDRESS
            }).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        } else {
            App.ethMessagingContract.sendMessage($('#receiver').val(), hash).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        }
    },

    sendMessage: async () => {
        let senderPublicKey = await App.ethMessagingContract.getPublicKey.call(web3.eth.accounts[0]);
        if (!sessionStorage.getItem(KEY_PK) || !senderPublicKey) {
            App.error('You need to import your private key in order to send/receive messages.');
            return;
        }
        if (!$('#message').val()) {
            App.error('Empty message.');
            return;
        }
        let receiverPublicKey = await App.ethMessagingContract.getPublicKey.call($('#receiver').val());
        if (!receiverPublicKey) {
            App.error('Cannot send message because receiver has not set its private key.');
            return;
        }
        let message = new Buffer($('#message').val());
        let encryptedMessage = ecies.encrypt(new Buffer(receiverPublicKey, 'hex'), message).toString('base64');
        let hash = await App.swarmClient.bzz.upload(encryptedMessage, {
            contentType: 'text/plain',
            encrypt: true
        });

        if ($('#anonymousCheck').is(':checked')) {
            // Send message as anonymous. All anonymous messages will be sent with the same address.
            let gasAmount = await App.anonymousethMessagingContract.sendMessage.estimateGas($('#receiver').val(), hash, {from: ANONYMOUS_ADDRESS});
            App.anonymousethMessagingContract.sendMessage($('#receiver').val(), hash, {
                gas: gasAmount,
                from: ANONYMOUS_ADDRESS
            }).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        } else {
            App.ethMessagingContract.sendMessage($('#receiver').val(), hash).then(() => {
                $('#message').val('');
                App.success('Message sent successfully.')
            }).catch((err) => {
                App.error('Error sending message: ' + err.message);
            });
        }
    },

    receiveMessage: async (err, result) => {
        if (!err) {
            if (result.args.receiver === web3.eth.accounts[0] && !App.messages[result.args.hash]) {
                App.loadMessage(result.args.sender, result.args.hash, result.args.time, true);
                $('#newMessage').show('slow');
            }
        } else {
            App.error('Error getting message: ' + err.message);
        }
    },

    decryptMessage: async (hash) => {
        let messagePromise = await App.swarmClient.bzz.download(hash);
        let encryptedMessage = new Buffer(await messagePromise.text(), 'base64');
        // Decrypt message with account private key.
        return ecies.decrypt(new Buffer(sessionStorage.getItem(KEY_PK), 'hex'), encryptedMessage).toString();
    },

    success: (message) => {
        $('#successAlert').html(message);
        $('#successAlert').show('slow');
        setTimeout(() => {
            $('#successAlert').hide('slow');
        }, 3000);
    },

    error: (message) => {
        $('#errorAlert').html(message);
        $('#errorAlert').show('slow');
        setTimeout(() => {
            $('#errorAlert').hide('slow');
        }, 3000);
    }
};

$(() => {
    $(window).load(() => {
        App.init();
    });
});
