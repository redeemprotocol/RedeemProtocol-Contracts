.PHONY: gen-golang
gen-golang:
	docker run --rm -v $(shell pwd):/root ethereum/solc:0.8.11-alpine --overwrite --base-path /root/contracts --include-path /root/node_modules --abi --bin /root/contracts/redeemprotocol.sol -o /root/contracts/build
	docker run --rm -v $(shell pwd):/root ethereum/client-go:alltools-v1.10.7 abigen --abi /root/contracts/build/RedeemProtocol.abi --bin /root/contracts/build/RedeemProtocol.bin --pkg core --out /root/golang/core/core_gen.go
