.PHONY: gen-golang
gen-golang:
	rm -rf ./golang/redeemprotocolfactory/*
	rm -rf ./golang/redeemprotocolreverse/*
	docker run --rm -v $(shell pwd):/root ethereum/solc:0.8.16-alpine --overwrite --base-path /root/contracts --include-path /root/node_modules --abi --bin /root/contracts/RedeemProtocolFactory.sol -o /root/contracts/build
	docker run --rm -v $(shell pwd):/root ethereum/solc:0.8.16-alpine --overwrite --base-path /root/contracts --include-path /root/node_modules --abi --bin /root/contracts/RedeemProtocolReverse.sol -o /root/contracts/build
	docker run --rm -v $(shell pwd):/root ethereum/client-go:alltools-v1.10.25 abigen --abi /root/contracts/build/RedeemProtocolFactory.abi --bin /root/contracts/build/RedeemProtocolFactory.bin --pkg redeemprotocolfactory --out /root/golang/redeemprotocolfactory/RedeemProtocolFactory_gen.go
	docker run --rm -v $(shell pwd):/root ethereum/client-go:alltools-v1.10.25 abigen --abi /root/contracts/build/RedeemProtocolReverse.abi --bin /root/contracts/build/RedeemProtocolReverse.bin --pkg redeemprotocolreverse --out /root/golang/redeemprotocolreverse/RedeemProtocolReverse_gen.go
