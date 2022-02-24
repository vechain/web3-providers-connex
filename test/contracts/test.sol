// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9;

contract Test {
	uint a_;
	string b_;

	constructor(uint a, string memory b) {
		a_ = a;
		b_ = b;
	}

	function get() public view returns (uint, string memory) {
		return (a_, b_);
	}

	function set(uint a, string memory b) public {
		require(a > 10, 'Test error message');

		a_ = a;
		b_ = b;
	}
}