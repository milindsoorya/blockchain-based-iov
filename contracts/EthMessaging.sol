pragma solidity >=0.4.0;

import "./IERCMessagingSystemProtocol.sol";


/**
 * @title EthMessaging.
 * @notice Contract for sending messages between accounts.
 */
contract EthMessaging is IERCMessagingSystemProtocol {

    /**
     * @notice Message struct.
     */
    struct Message {
        address from;
        string hash;
        uint256 time;
    }

    /**
     * @notice Mapping for storing address last message index.
     */
    mapping(address => uint256) private _lastMsgIndex;

    /**
     * @notice Mapping for storing address messages.
     */
    mapping(address => mapping(uint256 => Message)) private _messages;

    /**
     * @notice Mapping for storing address public keys.
     */
    mapping(address => string) private _keys;

    /**
     * @notice Sets public key for sender.
     *
     * @param key Public key for decrypting messages.
     */
    function setPublicKey(string key) external {
        require(bytes(key).length > 0, "key should not be empty.");
        _keys[msg.sender] = key;
        emit PublicKeyUpdated(msg.sender, key);
    }

    /**
     * @notice Sends message hash to given address.
     * The receiver needs to have public key.
     *
     * @param to Receiver address. Should not be address(0).
     * @param hash Message hash. Should not be empty
     */
    function sendMessage(address to, string hash) external {
        require(to != address(0), "to should not be address(0).");
        require(bytes(_keys[to]).length > 0, "to should have public key.");
        require(bytes(hash).length > 0, "hash should not be empty.");
        _messages[to][_lastMsgIndex[to]].from = msg.sender;
        _messages[to][_lastMsgIndex[to]].hash = hash;
        _messages[to][_lastMsgIndex[to]].time = now;
        _lastMsgIndex[to]++;
        emit MessageSent(
            msg.sender,
            to,
            now,
            hash
        );
    }

    /**
     * @notice Gets last message index.
     *
     * @param who Message owner.
     *
     * @return uint256 last message index.
     */
    function lastIndex(address who) public view returns (uint256) {
        return _lastMsgIndex[who];
    }

    /**
     * @notice Gets last message.
     *
     * @param who Message owner. Should have some message.
     *
     * @return sender address, message hash and message date.
     */
    function getLastMessage(address who) public view returns (address, string memory, uint256) {
        require(_lastMsgIndex[who] > 0, "who does not have any message.");
        return (
            _messages[who][_lastMsgIndex[who] - 1].from,
            _messages[who][_lastMsgIndex[who] - 1].hash,
            _messages[who][_lastMsgIndex[who] - 1].time
        );
    }

    /**
     * @notice Gets message by index.
     *
     * @param who Message owner.
     * @param index Message index. Should be a correct index.
     *
     * @return sender address, message hash and message date.
     */
    function getMessageByIndex(address who, uint256 index) public view returns (address, string memory, uint256) {
        require(index <= _lastMsgIndex[who], "index is bigger than last message index.");
        return (
            _messages[who][index - 1].from,
            _messages[who][index - 1].hash,
            _messages[who][index - 1].time
        );
    }

    /**
     * @notice Gets address public key.
     *
     * @param who Public key owner.
     *
     * @return adress public key.
     */
    function getPublicKey(address who) public view returns (string memory key) {
        return _keys[who];
    }
}
