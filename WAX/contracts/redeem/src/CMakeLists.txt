project(redeemprotocol)

set(EOSIO_WASM_OLD_BEHAVIOR "Off")
find_package(eosio.cdt)

add_contract( redeemprotocol redeemprotocol redeemprotocol.cpp )
target_include_directories( redeemprotocol PUBLIC ${CMAKE_SOURCE_DIR}/../include )
target_ricardian_directory( redeemprotocol ${CMAKE_SOURCE_DIR}/../ricardian )