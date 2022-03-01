// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9;

contract Test {
	uint a_;
	string b_;

	event Deploy(address indexed from, uint a, string b);
	event Set(address indexed from, uint a, string b);

	constructor(uint a, string memory b) {
		a_ = a;
		b_ = b;

		emit Deploy(msg.sender, a_, b_);
	}

	function get() public view returns (uint, string memory) {
		require(a_ > 10, 'Test error message in contract call');
		return (a_, b_);
	}

	function set(uint a, string memory b) public {
		a_ = a;
		b_ = b;

		emit Set(msg.sender, a_, b_);
	}
}