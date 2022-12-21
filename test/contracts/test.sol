// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

contract Test {
    uint256 a_;
    string b_;
	Test1 t = new Test1();

    event Deploy(address indexed from, uint256 a, string b);
    event Set(address indexed from, uint256 a, string b);

    constructor(uint256 a, string memory b) {
        a_ = a;
        b_ = b;

        emit Deploy(msg.sender, a_, b_);
    }

    function get() public view returns (uint256, string memory) {
        require(a_ > 10, "Test error message in contract call");
        return (a_, b_);
    }

    function set(uint256 a, string memory b) public {
        a_ = a;
        b_ = b;

		t.set(a);

        emit Set(msg.sender, a_, b_);
    }
}

contract Test1 {
    uint256 a_;
    event Set(address indexed from, uint256 a);

    function set(uint256 a) public {
        a_ = a;
        emit Set(msg.sender, a_);
    }
}
