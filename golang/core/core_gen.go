// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package core

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
)

// CoreMetaData contains all meta data concerning the Core contract.
var CoreMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"_contract\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"_tokenId\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"_from\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"_to\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"_type\",\"type\":\"string\"}],\"name\":\"Redeem\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_contract\",\"type\":\"address\"}],\"name\":\"flipValidContract\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"isRedeemed\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_contract\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"redeemWithBurn\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_contract\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"redeemWithMark\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_contract\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_tokenId\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"_to\",\"type\":\"address\"}],\"name\":\"redeemWithTransfer\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"renounceOwnership\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_contract\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_tokenId\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"_redeemed\",\"type\":\"bool\"}],\"name\":\"setRedeemed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"transferOwnership\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"validContracts\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
	Bin: "0x608060405234801561001057600080fd5b5061002d61002261003260201b60201c565b61003a60201b60201c565b6100fe565b600033905090565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b6116158061010d6000396000f3fe608060405234801561001057600080fd5b506004361061009e5760003560e01c8063bcbd92e011610066578063bcbd92e014610133578063bd737dc51461014f578063c849dd8e1461016b578063cb4659af14610187578063f2fde38b146101b75761009e565b806321c589a5146100a3578063487f6630146100bf578063715018a6146100ef5780638da5cb5b146100f9578063af96ce8414610117575b600080fd5b6100bd60048036038101906100b89190610f11565b6101d3565b005b6100d960048036038101906100d49190610f11565b610282565b6040516100e69190610f59565b60405180910390f35b6100f76102a2565b005b6101016102b6565b60405161010e9190610f83565b60405180910390f35b610131600480360381019061012c9190610fd4565b6102df565b005b61014d60048036038101906101489190610fd4565b61057d565b005b61016960048036038101906101649190611014565b6107b0565b005b61018560048036038101906101809190611093565b610a52565b005b6101a1600480360381019061019c9190610fd4565b610ac7565b6040516101ae9190610f59565b60405180910390f35b6101d160048036038101906101cc9190610f11565b610af6565b005b6101db610b7a565b600160008273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff1615600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff02191690831515021790555050565b60016020528060005260406000206000915054906101000a900460ff1681565b6102aa610b7a565b6102b46000610bf8565b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff1661036b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161036290611143565b60405180910390fd5b600260008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082815260200190815260200160002060009054906101000a900460ff1615610409576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610400906111af565b60405180910390fd5b610414828233610cbc565b610453576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161044a9061121b565b60405180910390fd5b8173ffffffffffffffffffffffffffffffffffffffff166342966c68826040518263ffffffff1660e01b815260040161048c919061124a565b600060405180830381600087803b1580156104a657600080fd5b505af11580156104ba573d6000803e3d6000fd5b505050506001600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600083815260200190815260200160002060006101000a81548160ff021916908315150217905550808273ffffffffffffffffffffffffffffffffffffffff167f7999fef606c7670da69bc02077453bb99c5ee5c5a8a85e6ab9e4fea922f954d13360006040516105719291906112b1565b60405180910390a35050565b600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16610609576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161060090611143565b60405180910390fd5b600260008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082815260200190815260200160002060009054906101000a900460ff16156106a7576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161069e906111af565b60405180910390fd5b6106b2828233610cbc565b6106f1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106e89061121b565b60405180910390fd5b6001600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600083815260200190815260200160002060006101000a81548160ff021916908315150217905550808273ffffffffffffffffffffffffffffffffffffffff167f7999fef606c7670da69bc02077453bb99c5ee5c5a8a85e6ab9e4fea922f954d13360006040516107a4929190611339565b60405180910390a35050565b600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff1661083c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161083390611143565b60405180910390fd5b600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600083815260200190815260200160002060009054906101000a900460ff16156108da576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108d1906111af565b60405180910390fd5b6108e5838333610cbc565b610924576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161091b9061121b565b60405180910390fd5b8273ffffffffffffffffffffffffffffffffffffffff166342842e0e3383856040518463ffffffff1660e01b815260040161096193929190611375565b600060405180830381600087803b15801561097b57600080fd5b505af115801561098f573d6000803e3d6000fd5b505050506001600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600084815260200190815260200160002060006101000a81548160ff021916908315150217905550818373ffffffffffffffffffffffffffffffffffffffff167f7999fef606c7670da69bc02077453bb99c5ee5c5a8a85e6ab9e4fea922f954d13384604051610a459291906113f8565b60405180910390a3505050565b610a5a610b7a565b80600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600084815260200190815260200160002060006101000a81548160ff021916908315150217905550505050565b60026020528160005260406000206020528060005260406000206000915091509054906101000a900460ff1681565b610afe610b7a565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161415610b6e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b65906114a6565b60405180910390fd5b610b7781610bf8565b50565b610b82610ea6565b73ffffffffffffffffffffffffffffffffffffffff16610ba06102b6565b73ffffffffffffffffffffffffffffffffffffffff1614610bf6576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bed90611512565b60405180910390fd5b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b6000808473ffffffffffffffffffffffffffffffffffffffff16636352211e856040518263ffffffff1660e01b8152600401610cf8919061124a565b602060405180830381865afa158015610d15573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610d399190611547565b90508073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161480610e1957508273ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff1663081812fc866040518263ffffffff1660e01b8152600401610dc0919061124a565b602060405180830381865afa158015610ddd573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e019190611547565b73ffffffffffffffffffffffffffffffffffffffff16145b80610e9c57508473ffffffffffffffffffffffffffffffffffffffff1663e985e9c582856040518363ffffffff1660e01b8152600401610e5a929190611574565b602060405180830381865afa158015610e77573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e9b91906115b2565b5b9150509392505050565b600033905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610ede82610eb3565b9050919050565b610eee81610ed3565b8114610ef957600080fd5b50565b600081359050610f0b81610ee5565b92915050565b600060208284031215610f2757610f26610eae565b5b6000610f3584828501610efc565b91505092915050565b60008115159050919050565b610f5381610f3e565b82525050565b6000602082019050610f6e6000830184610f4a565b92915050565b610f7d81610ed3565b82525050565b6000602082019050610f986000830184610f74565b92915050565b6000819050919050565b610fb181610f9e565b8114610fbc57600080fd5b50565b600081359050610fce81610fa8565b92915050565b60008060408385031215610feb57610fea610eae565b5b6000610ff985828601610efc565b925050602061100a85828601610fbf565b9150509250929050565b60008060006060848603121561102d5761102c610eae565b5b600061103b86828701610efc565b935050602061104c86828701610fbf565b925050604061105d86828701610efc565b9150509250925092565b61107081610f3e565b811461107b57600080fd5b50565b60008135905061108d81611067565b92915050565b6000806000606084860312156110ac576110ab610eae565b5b60006110ba86828701610efc565b93505060206110cb86828701610fbf565b92505060406110dc8682870161107e565b9150509250925092565b600082825260208201905092915050565b7f696e76616c696420636f6e747261637420616464726573730000000000000000600082015250565b600061112d6018836110e6565b9150611138826110f7565b602082019050919050565b6000602082019050818103600083015261115c81611120565b9050919050565b7f616c72656164792072656465656d656400000000000000000000000000000000600082015250565b60006111996010836110e6565b91506111a482611163565b602082019050919050565b600060208201905081810360008301526111c88161118c565b9050919050565b7f63616c6c6572206973206e6f74206f776e6572206e6f7220617070726f766564600082015250565b60006112056020836110e6565b9150611210826111cf565b602082019050919050565b60006020820190508181036000830152611234816111f8565b9050919050565b61124481610f9e565b82525050565b600060208201905061125f600083018461123b565b92915050565b7f6275726e00000000000000000000000000000000000000000000000000000000600082015250565b600061129b6004836110e6565b91506112a682611265565b602082019050919050565b60006060820190506112c66000830185610f74565b6112d36020830184610f74565b81810360408301526112e48161128e565b90509392505050565b7f6d61726b00000000000000000000000000000000000000000000000000000000600082015250565b60006113236004836110e6565b915061132e826112ed565b602082019050919050565b600060608201905061134e6000830185610f74565b61135b6020830184610f74565b818103604083015261136c81611316565b90509392505050565b600060608201905061138a6000830186610f74565b6113976020830185610f74565b6113a4604083018461123b565b949350505050565b7f7472616e73666572000000000000000000000000000000000000000000000000600082015250565b60006113e26008836110e6565b91506113ed826113ac565b602082019050919050565b600060608201905061140d6000830185610f74565b61141a6020830184610f74565b818103604083015261142b816113d5565b90509392505050565b7f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160008201527f6464726573730000000000000000000000000000000000000000000000000000602082015250565b60006114906026836110e6565b915061149b82611434565b604082019050919050565b600060208201905081810360008301526114bf81611483565b9050919050565b7f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572600082015250565b60006114fc6020836110e6565b9150611507826114c6565b602082019050919050565b6000602082019050818103600083015261152b816114ef565b9050919050565b60008151905061154181610ee5565b92915050565b60006020828403121561155d5761155c610eae565b5b600061156b84828501611532565b91505092915050565b60006040820190506115896000830185610f74565b6115966020830184610f74565b9392505050565b6000815190506115ac81611067565b92915050565b6000602082840312156115c8576115c7610eae565b5b60006115d68482850161159d565b9150509291505056fea2646970667358221220ee2f30203a796cd101d6661ba13ec54dcce9ea5bf703004e74470e790366624d64736f6c634300080b0033",
}

// CoreABI is the input ABI used to generate the binding from.
// Deprecated: Use CoreMetaData.ABI instead.
var CoreABI = CoreMetaData.ABI

// CoreBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use CoreMetaData.Bin instead.
var CoreBin = CoreMetaData.Bin

// DeployCore deploys a new Ethereum contract, binding an instance of Core to it.
func DeployCore(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *Core, error) {
	parsed, err := CoreMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(CoreBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &Core{CoreCaller: CoreCaller{contract: contract}, CoreTransactor: CoreTransactor{contract: contract}, CoreFilterer: CoreFilterer{contract: contract}}, nil
}

// Core is an auto generated Go binding around an Ethereum contract.
type Core struct {
	CoreCaller     // Read-only binding to the contract
	CoreTransactor // Write-only binding to the contract
	CoreFilterer   // Log filterer for contract events
}

// CoreCaller is an auto generated read-only Go binding around an Ethereum contract.
type CoreCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// CoreTransactor is an auto generated write-only Go binding around an Ethereum contract.
type CoreTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// CoreFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type CoreFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// CoreSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type CoreSession struct {
	Contract     *Core             // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// CoreCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type CoreCallerSession struct {
	Contract *CoreCaller   // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts // Call options to use throughout this session
}

// CoreTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type CoreTransactorSession struct {
	Contract     *CoreTransactor   // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// CoreRaw is an auto generated low-level Go binding around an Ethereum contract.
type CoreRaw struct {
	Contract *Core // Generic contract binding to access the raw methods on
}

// CoreCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type CoreCallerRaw struct {
	Contract *CoreCaller // Generic read-only contract binding to access the raw methods on
}

// CoreTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type CoreTransactorRaw struct {
	Contract *CoreTransactor // Generic write-only contract binding to access the raw methods on
}

// NewCore creates a new instance of Core, bound to a specific deployed contract.
func NewCore(address common.Address, backend bind.ContractBackend) (*Core, error) {
	contract, err := bindCore(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Core{CoreCaller: CoreCaller{contract: contract}, CoreTransactor: CoreTransactor{contract: contract}, CoreFilterer: CoreFilterer{contract: contract}}, nil
}

// NewCoreCaller creates a new read-only instance of Core, bound to a specific deployed contract.
func NewCoreCaller(address common.Address, caller bind.ContractCaller) (*CoreCaller, error) {
	contract, err := bindCore(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &CoreCaller{contract: contract}, nil
}

// NewCoreTransactor creates a new write-only instance of Core, bound to a specific deployed contract.
func NewCoreTransactor(address common.Address, transactor bind.ContractTransactor) (*CoreTransactor, error) {
	contract, err := bindCore(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &CoreTransactor{contract: contract}, nil
}

// NewCoreFilterer creates a new log filterer instance of Core, bound to a specific deployed contract.
func NewCoreFilterer(address common.Address, filterer bind.ContractFilterer) (*CoreFilterer, error) {
	contract, err := bindCore(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &CoreFilterer{contract: contract}, nil
}

// bindCore binds a generic wrapper to an already deployed contract.
func bindCore(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(CoreABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Core *CoreRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Core.Contract.CoreCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Core *CoreRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Core.Contract.CoreTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Core *CoreRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Core.Contract.CoreTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Core *CoreCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Core.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Core *CoreTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Core.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Core *CoreTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Core.Contract.contract.Transact(opts, method, params...)
}

// IsRedeemed is a free data retrieval call binding the contract method 0xcb4659af.
//
// Solidity: function isRedeemed(address , uint256 ) view returns(bool)
func (_Core *CoreCaller) IsRedeemed(opts *bind.CallOpts, arg0 common.Address, arg1 *big.Int) (bool, error) {
	var out []interface{}
	err := _Core.contract.Call(opts, &out, "isRedeemed", arg0, arg1)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsRedeemed is a free data retrieval call binding the contract method 0xcb4659af.
//
// Solidity: function isRedeemed(address , uint256 ) view returns(bool)
func (_Core *CoreSession) IsRedeemed(arg0 common.Address, arg1 *big.Int) (bool, error) {
	return _Core.Contract.IsRedeemed(&_Core.CallOpts, arg0, arg1)
}

// IsRedeemed is a free data retrieval call binding the contract method 0xcb4659af.
//
// Solidity: function isRedeemed(address , uint256 ) view returns(bool)
func (_Core *CoreCallerSession) IsRedeemed(arg0 common.Address, arg1 *big.Int) (bool, error) {
	return _Core.Contract.IsRedeemed(&_Core.CallOpts, arg0, arg1)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Core *CoreCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Core.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Core *CoreSession) Owner() (common.Address, error) {
	return _Core.Contract.Owner(&_Core.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Core *CoreCallerSession) Owner() (common.Address, error) {
	return _Core.Contract.Owner(&_Core.CallOpts)
}

// ValidContracts is a free data retrieval call binding the contract method 0x487f6630.
//
// Solidity: function validContracts(address ) view returns(bool)
func (_Core *CoreCaller) ValidContracts(opts *bind.CallOpts, arg0 common.Address) (bool, error) {
	var out []interface{}
	err := _Core.contract.Call(opts, &out, "validContracts", arg0)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// ValidContracts is a free data retrieval call binding the contract method 0x487f6630.
//
// Solidity: function validContracts(address ) view returns(bool)
func (_Core *CoreSession) ValidContracts(arg0 common.Address) (bool, error) {
	return _Core.Contract.ValidContracts(&_Core.CallOpts, arg0)
}

// ValidContracts is a free data retrieval call binding the contract method 0x487f6630.
//
// Solidity: function validContracts(address ) view returns(bool)
func (_Core *CoreCallerSession) ValidContracts(arg0 common.Address) (bool, error) {
	return _Core.Contract.ValidContracts(&_Core.CallOpts, arg0)
}

// FlipValidContract is a paid mutator transaction binding the contract method 0x21c589a5.
//
// Solidity: function flipValidContract(address _contract) returns()
func (_Core *CoreTransactor) FlipValidContract(opts *bind.TransactOpts, _contract common.Address) (*types.Transaction, error) {
	return _Core.contract.Transact(opts, "flipValidContract", _contract)
}

// FlipValidContract is a paid mutator transaction binding the contract method 0x21c589a5.
//
// Solidity: function flipValidContract(address _contract) returns()
func (_Core *CoreSession) FlipValidContract(_contract common.Address) (*types.Transaction, error) {
	return _Core.Contract.FlipValidContract(&_Core.TransactOpts, _contract)
}

// FlipValidContract is a paid mutator transaction binding the contract method 0x21c589a5.
//
// Solidity: function flipValidContract(address _contract) returns()
func (_Core *CoreTransactorSession) FlipValidContract(_contract common.Address) (*types.Transaction, error) {
	return _Core.Contract.FlipValidContract(&_Core.TransactOpts, _contract)
}

// RedeemWithBurn is a paid mutator transaction binding the contract method 0xaf96ce84.
//
// Solidity: function redeemWithBurn(address _contract, uint256 _tokenId) returns()
func (_Core *CoreTransactor) RedeemWithBurn(opts *bind.TransactOpts, _contract common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _Core.contract.Transact(opts, "redeemWithBurn", _contract, _tokenId)
}

// RedeemWithBurn is a paid mutator transaction binding the contract method 0xaf96ce84.
//
// Solidity: function redeemWithBurn(address _contract, uint256 _tokenId) returns()
func (_Core *CoreSession) RedeemWithBurn(_contract common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _Core.Contract.RedeemWithBurn(&_Core.TransactOpts, _contract, _tokenId)
}

// RedeemWithBurn is a paid mutator transaction binding the contract method 0xaf96ce84.
//
// Solidity: function redeemWithBurn(address _contract, uint256 _tokenId) returns()
func (_Core *CoreTransactorSession) RedeemWithBurn(_contract common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _Core.Contract.RedeemWithBurn(&_Core.TransactOpts, _contract, _tokenId)
}

// RedeemWithMark is a paid mutator transaction binding the contract method 0xbcbd92e0.
//
// Solidity: function redeemWithMark(address _contract, uint256 _tokenId) returns()
func (_Core *CoreTransactor) RedeemWithMark(opts *bind.TransactOpts, _contract common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _Core.contract.Transact(opts, "redeemWithMark", _contract, _tokenId)
}

// RedeemWithMark is a paid mutator transaction binding the contract method 0xbcbd92e0.
//
// Solidity: function redeemWithMark(address _contract, uint256 _tokenId) returns()
func (_Core *CoreSession) RedeemWithMark(_contract common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _Core.Contract.RedeemWithMark(&_Core.TransactOpts, _contract, _tokenId)
}

// RedeemWithMark is a paid mutator transaction binding the contract method 0xbcbd92e0.
//
// Solidity: function redeemWithMark(address _contract, uint256 _tokenId) returns()
func (_Core *CoreTransactorSession) RedeemWithMark(_contract common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _Core.Contract.RedeemWithMark(&_Core.TransactOpts, _contract, _tokenId)
}

// RedeemWithTransfer is a paid mutator transaction binding the contract method 0xbd737dc5.
//
// Solidity: function redeemWithTransfer(address _contract, uint256 _tokenId, address _to) returns()
func (_Core *CoreTransactor) RedeemWithTransfer(opts *bind.TransactOpts, _contract common.Address, _tokenId *big.Int, _to common.Address) (*types.Transaction, error) {
	return _Core.contract.Transact(opts, "redeemWithTransfer", _contract, _tokenId, _to)
}

// RedeemWithTransfer is a paid mutator transaction binding the contract method 0xbd737dc5.
//
// Solidity: function redeemWithTransfer(address _contract, uint256 _tokenId, address _to) returns()
func (_Core *CoreSession) RedeemWithTransfer(_contract common.Address, _tokenId *big.Int, _to common.Address) (*types.Transaction, error) {
	return _Core.Contract.RedeemWithTransfer(&_Core.TransactOpts, _contract, _tokenId, _to)
}

// RedeemWithTransfer is a paid mutator transaction binding the contract method 0xbd737dc5.
//
// Solidity: function redeemWithTransfer(address _contract, uint256 _tokenId, address _to) returns()
func (_Core *CoreTransactorSession) RedeemWithTransfer(_contract common.Address, _tokenId *big.Int, _to common.Address) (*types.Transaction, error) {
	return _Core.Contract.RedeemWithTransfer(&_Core.TransactOpts, _contract, _tokenId, _to)
}

// RenounceOwnership is a paid mutator transaction binding the contract method 0x715018a6.
//
// Solidity: function renounceOwnership() returns()
func (_Core *CoreTransactor) RenounceOwnership(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Core.contract.Transact(opts, "renounceOwnership")
}

// RenounceOwnership is a paid mutator transaction binding the contract method 0x715018a6.
//
// Solidity: function renounceOwnership() returns()
func (_Core *CoreSession) RenounceOwnership() (*types.Transaction, error) {
	return _Core.Contract.RenounceOwnership(&_Core.TransactOpts)
}

// RenounceOwnership is a paid mutator transaction binding the contract method 0x715018a6.
//
// Solidity: function renounceOwnership() returns()
func (_Core *CoreTransactorSession) RenounceOwnership() (*types.Transaction, error) {
	return _Core.Contract.RenounceOwnership(&_Core.TransactOpts)
}

// SetRedeemed is a paid mutator transaction binding the contract method 0xc849dd8e.
//
// Solidity: function setRedeemed(address _contract, uint256 _tokenId, bool _redeemed) returns()
func (_Core *CoreTransactor) SetRedeemed(opts *bind.TransactOpts, _contract common.Address, _tokenId *big.Int, _redeemed bool) (*types.Transaction, error) {
	return _Core.contract.Transact(opts, "setRedeemed", _contract, _tokenId, _redeemed)
}

// SetRedeemed is a paid mutator transaction binding the contract method 0xc849dd8e.
//
// Solidity: function setRedeemed(address _contract, uint256 _tokenId, bool _redeemed) returns()
func (_Core *CoreSession) SetRedeemed(_contract common.Address, _tokenId *big.Int, _redeemed bool) (*types.Transaction, error) {
	return _Core.Contract.SetRedeemed(&_Core.TransactOpts, _contract, _tokenId, _redeemed)
}

// SetRedeemed is a paid mutator transaction binding the contract method 0xc849dd8e.
//
// Solidity: function setRedeemed(address _contract, uint256 _tokenId, bool _redeemed) returns()
func (_Core *CoreTransactorSession) SetRedeemed(_contract common.Address, _tokenId *big.Int, _redeemed bool) (*types.Transaction, error) {
	return _Core.Contract.SetRedeemed(&_Core.TransactOpts, _contract, _tokenId, _redeemed)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_Core *CoreTransactor) TransferOwnership(opts *bind.TransactOpts, newOwner common.Address) (*types.Transaction, error) {
	return _Core.contract.Transact(opts, "transferOwnership", newOwner)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_Core *CoreSession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _Core.Contract.TransferOwnership(&_Core.TransactOpts, newOwner)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_Core *CoreTransactorSession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _Core.Contract.TransferOwnership(&_Core.TransactOpts, newOwner)
}

// CoreOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the Core contract.
type CoreOwnershipTransferredIterator struct {
	Event *CoreOwnershipTransferred // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CoreOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CoreOwnershipTransferred)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CoreOwnershipTransferred)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CoreOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CoreOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CoreOwnershipTransferred represents a OwnershipTransferred event raised by the Core contract.
type CoreOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Core *CoreFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*CoreOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _Core.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &CoreOwnershipTransferredIterator{contract: _Core.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Core *CoreFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *CoreOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _Core.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CoreOwnershipTransferred)
				if err := _Core.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseOwnershipTransferred is a log parse operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Core *CoreFilterer) ParseOwnershipTransferred(log types.Log) (*CoreOwnershipTransferred, error) {
	event := new(CoreOwnershipTransferred)
	if err := _Core.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// CoreRedeemIterator is returned from FilterRedeem and is used to iterate over the raw logs and unpacked data for Redeem events raised by the Core contract.
type CoreRedeemIterator struct {
	Event *CoreRedeem // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CoreRedeemIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CoreRedeem)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CoreRedeem)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CoreRedeemIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CoreRedeemIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CoreRedeem represents a Redeem event raised by the Core contract.
type CoreRedeem struct {
	Contract common.Address
	TokenId  *big.Int
	From     common.Address
	To       common.Address
	Type     string
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterRedeem is a free log retrieval operation binding the contract event 0x7999fef606c7670da69bc02077453bb99c5ee5c5a8a85e6ab9e4fea922f954d1.
//
// Solidity: event Redeem(address indexed _contract, uint256 indexed _tokenId, address _from, address _to, string _type)
func (_Core *CoreFilterer) FilterRedeem(opts *bind.FilterOpts, _contract []common.Address, _tokenId []*big.Int) (*CoreRedeemIterator, error) {

	var _contractRule []interface{}
	for _, _contractItem := range _contract {
		_contractRule = append(_contractRule, _contractItem)
	}
	var _tokenIdRule []interface{}
	for _, _tokenIdItem := range _tokenId {
		_tokenIdRule = append(_tokenIdRule, _tokenIdItem)
	}

	logs, sub, err := _Core.contract.FilterLogs(opts, "Redeem", _contractRule, _tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &CoreRedeemIterator{contract: _Core.contract, event: "Redeem", logs: logs, sub: sub}, nil
}

// WatchRedeem is a free log subscription operation binding the contract event 0x7999fef606c7670da69bc02077453bb99c5ee5c5a8a85e6ab9e4fea922f954d1.
//
// Solidity: event Redeem(address indexed _contract, uint256 indexed _tokenId, address _from, address _to, string _type)
func (_Core *CoreFilterer) WatchRedeem(opts *bind.WatchOpts, sink chan<- *CoreRedeem, _contract []common.Address, _tokenId []*big.Int) (event.Subscription, error) {

	var _contractRule []interface{}
	for _, _contractItem := range _contract {
		_contractRule = append(_contractRule, _contractItem)
	}
	var _tokenIdRule []interface{}
	for _, _tokenIdItem := range _tokenId {
		_tokenIdRule = append(_tokenIdRule, _tokenIdItem)
	}

	logs, sub, err := _Core.contract.WatchLogs(opts, "Redeem", _contractRule, _tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CoreRedeem)
				if err := _Core.contract.UnpackLog(event, "Redeem", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseRedeem is a log parse operation binding the contract event 0x7999fef606c7670da69bc02077453bb99c5ee5c5a8a85e6ab9e4fea922f954d1.
//
// Solidity: event Redeem(address indexed _contract, uint256 indexed _tokenId, address _from, address _to, string _type)
func (_Core *CoreFilterer) ParseRedeem(log types.Log) (*CoreRedeem, error) {
	event := new(CoreRedeem)
	if err := _Core.contract.UnpackLog(event, "Redeem", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
