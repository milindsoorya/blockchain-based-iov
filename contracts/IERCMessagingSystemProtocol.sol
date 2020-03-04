pragma solidity >=0.4.0;

interface IERCMessagingSystemProtocol {
    function sendMessage(address to, string hash) external;

    function lastIndex(address who) external view returns (uint256);

    function getLastMessage(address who) external view returns (address, string memory, uint256);

    function getMessageByIndex(address who, uint256 index) external view returns (address, string memory, uint256);

    function getPublicKey(address who) external view returns (string memory key);

    function setPublicKey(string key) external;

    event MessageSent(
        address indexed sender,
        address indexed receiver,
        uint256 time,
        string hash
    );

    event PublicKeyUpdated(
        address indexed sender,
        string key
    );
}
